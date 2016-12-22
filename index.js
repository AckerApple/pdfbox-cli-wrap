//const Document = require('node-pdfbox');
const path = require('path')
//const pdfBoxJarPath = path.join(__dirname,'pdfbox-app-2.0.3.jar')
const ackPdfBoxPath = require.resolve("ack-pdfbox")
const ackPdfBoxJarPath = path.join(ackPdfBoxPath, "../", "dist","ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
//const ackPdfBoxJarPath = path.join(__dirname, "ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
//const pdfBoxJarPath = path.join(__dirname,"ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
const fs = require('fs')

function opsOntoSpawnArgs(options, sArgs){
  for(let name in options){
    if(!options[name] || !options[name].toString)continue;//value not a string, skip it
    sArgs.push( '-'+name )
    sArgs.push( options[name].toString() )
  }
}

function figureOutAndOptions(outputPathOrOptions, options){
  let outputPath = ''
  
  if(outputPathOrOptions){//2nd arg defined?
    if(outputPathOrOptions.split){//is string for output path?
      outputPath = outputPathOrOptions
    }else{
      options = outputPathOrOptions//its actually options
    }
  }

  options = Object.assign({}, options)//param and clone

  return {options:options, outputPath:outputPath}
}

class PdfBoxCliWrap{
  static promiseJavaSpawn(sArgs){
    return new Promise((res,rej)=>{
      const dataArray = []
      const spawn = require('child_process').spawn;
      const ls = spawn('java', sArgs);
      let spawnError = null

      const upgradeError = err=>{
        if(!err)return err

        if(err.message){
          let msg = err.msg
          msg += '\njava-exec-args:'+ JSON.stringify(sArgs)
          err = new Error(msg)
        }else if(err.split){
          let msg = err
          msg += '\njava-exec-args:'+ JSON.stringify(sArgs)
          err = new Error(msg)
        }

        return err
      }

      ls.stdout.on('data', data=>dataArray.push(data));
      ls.stderr.on('data', data=>dataArray.push(data));

      ls.stdout.on('error', err=>spawnError=err)
      ls.stderr.on('error', err=>spawnError=err)

      ls.on('close', code=>{
        if(spawnError){
          return rej( upgradeError(spawnError) )
        }

        const output = dataArray.join('')//bring all cli data together

        if(
            output.substring(0, 6)=='Error:'
        ||  output.substring(0, 9)=='Exception'
        ||  output.substring(0, 6)=='Usage:'
        ||  output.search('java.io')>=0
        ){
          return rej( upgradeError(output) )
        }

        res( output )
      })
    })
  }

  /** Returns array of objects
  @pdfPath - The PDF file to read form fields from
  */
  static getFormFields(pdfPath){
    const sArgs = ['-jar', ackPdfBoxJarPath, 'read', pdfPath]
    return this.promiseJavaSpawn(sArgs).then(data=>{
      data = data.trim()
      if(data.substring(data.length-1)==','){
        data = data.substring(0, data.length-1)//somehow a comma is being added?
      }

      return JSON.parse(data)
    })
  }
  
  /** Returns object of objects where key is fullyQualifiedName of PDF Acroform field
  @pdfPath - The PDF file to read form fields from
  */
  static getFormFieldsAsObject(pdfPath){
    return this.getFormFields(pdfPath).then(data=>{
      const rtnOb = {}
      for(let x=0; x < data.length; ++x){
        rtnOb[ data[x].fullyQualifiedName ] = data[x]
      }
      return rtnOb
    })
  }

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
    @options{
      password Password to the PDF or certificate in keystore.
      keyStore Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
      tsa
    }

  */
  static sign(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const sArgs = ['-jar', ackPdfBoxJarPath, 'sign']

    sArgs.push(args.options.keyStore)
    sArgs.push(args.options.password)
    sArgs.push(pdfPath)

    delete args.options.keyStore
    delete args.options.password
    delete args.options.pdfPath

    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push('-out')
      sArgs.push(args.outputPath)
    }

    return this.promiseJavaSpawn(sArgs)
  }

  /**  */
  static signToBuffer(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(options)
    const writePath = path.join(process.cwd(), 'tempBufferFile'+process.uptime()+'.pdf')

    return this.sign(pdfPath, writePath, options)
    .then(msg=>{
      return new Promise(function(res,rej){
        fs.readFile(writePath,(err,buffer)=>{
          fs.unlink(writePath,e=>e)
          if(err)return rej(err)
          res(buffer)
        })
      })
    })
  }

  /**  */
  static signByBuffer(buffer, options){
    const writePath = path.join(process.cwd(), 'tempBufferFile'+process.uptime()+'.pdf')
    return new Promise(function(res,rej){
      fs.writeFile(writePath,buffer,(err,data)=>{
        if(err)return rej(err)
        res(writePath)
      })
    })
    .then(writePath=>this.signToBuffer(writePath, options))
    .then(buffer=>{
      fs.unlink(writePath,e=>e)
      return buffer
    })
    .catch(e=>{
      fs.unlink(writePath,e=>e)
      throw e
    })
  }

  /** Takes array of objects and sets values of PDF Acroform fields
    @pdfPath - The PDF file to read form fields from
    @fieldArray - Array of PDF field definitions
    @outPdfPath - Where to write PDF that has been filled
  */
  static embedFormFields(pdfPath, fieldArray, outPdfPath){
    const jsonFilePath = path.join(process.cwd(),'tempAcroformJson_'+process.uptime()+'.json')
    const sArgs = ['-jar', ackPdfBoxJarPath, 'fill', pdfPath, jsonFilePath, outPdfPath]
    fieldArray = JSON.stringify(fieldArray, null, 2)
    fs.writeFileSync(jsonFilePath, fieldArray)
    
    return this.promiseJavaSpawn(sArgs)
    .then(data=>{
      fs.unlink(jsonFilePath,function(){})
      return data
    })
    .catch(e=>{
      fs.unlink(jsonFilePath,function(){})
      throw e
    })
  }

  /** Takes objects of objects and sets values of PDF Acroform fields
  @pdfPath - The PDF file to read form fields from
  @fieldArray - Array of PDF field definitions
  @outPdfPath - Where to write PDF that has been filled
  */
  static embedFormFieldsByObject(pdfPath, fields, outPdfPath){
    const fieldArray = []
    for(let x in fields){
      fieldArray.push( fields[x] )
    }
    return this.embedFormFields(pdfPath, fieldArray, outPdfPath);
  }

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
    @options - {
      O                          The owner password to the PDF, ignored if -certFile is specified.
      U                          The user password to the PDF, ignored if -certFile is specified.
      password                   Alias of option U
      certFile                   Path to X.509 cert file.
      canAssemble                true  Set the assemble permission.
      canExtractContent          true  Set the extraction permission.
      canExtractForAccessibility true  Set the extraction permission.
      canFillInForm              true  Set the fill in form permission.
      canModify                  true  Set the modify permission.
      canModifyAnnotations       true  Set the modify annots permission.
      canPrint                   true  Set the print permission.
      canPrintDegraded           true  Set the print degraded permission.
      keyLength                  40, 128 or 256  The number of bits for the encryption key. For 128 and above bits Java Cryptography Extension (JCE) Unlimited Strength Jurisdiction Policy Files must be installed.
    }
  */
  static encrypt(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const sArgs = ['-jar', ackPdfBoxJarPath, 'Encrypt', pdfPath]

    //password is actually -U and must be changed out
    if(args.options.password){
      args.options.U = args.options.password
      delete args.options.password
    }
    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push(args.outputPath)
    }

    return this.promiseJavaSpawn(sArgs)
  }

  static encryptToBuffer(pdfPath, options){
    let args = figureOutAndOptions(options)
    const writePath = path.join(process.cwd(), 'tempBufferFile'+process.uptime()+'.pdf')

    return this.encrypt(pdfPath, writePath, options)
    .then(()=>{
      return new Promise(function(res,rej){
        fs.readFile(writePath,(err,buffer)=>{
          fs.unlink(writePath,e=>e)
          if(err)return rej(err)
          res(buffer)
        })
      })
    })
  }

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
    @options - {
      password Password to the PDF or certificate in keystore.
      keyStore Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
      alias    The alias to the certificate in the keystore.
    }
  */
  static decrypt(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const sArgs = ['-jar', ackPdfBoxJarPath, 'Decrypt', pdfPath]

    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push(args.outputPath)
    }

    return this.promiseJavaSpawn(sArgs)
  }

  static decryptToBuffer(pdfPath, options){
    let args = figureOutAndOptions(options)
    const writePath = path.join(process.cwd(), 'tempBufferFile'+process.uptime()+'.pdf')

    return this.decrypt(pdfPath, writePath, options)
    .then(msg=>{
      return new Promise(function(res,rej){
        fs.readFile(writePath,(err,buffer)=>{
          fs.unlink(writePath,e=>e)
          if(err)return rej(err)
          res(buffer)
        })
      })
    })
  }

  static encryptByBuffer(buffer, options){
    const writePath = path.join(process.cwd(), 'tempBufferFile'+process.uptime()+'.pdf')
    return new Promise(function(res,rej){
      fs.writeFile(writePath,buffer,(err,data)=>{
        if(err)return rej(err)
        res(writePath)
      })
    })
    .then(writePath=>this.encryptToBuffer(writePath, options))
    .then(buffer=>{
      fs.unlink(writePath,e=>e)
      return buffer
    })
    .catch(e=>{
      fs.unlink(writePath,e=>e)
      throw e
    })
  }

  static decryptByBuffer(buffer, options){
    const writePath = path.join(process.cwd(), 'tempBufferFile'+process.uptime()+'.pdf')
    return new Promise(function(res,rej){
      fs.writeFile(writePath,buffer,(err,data)=>{
        if(err)return rej(err)
        res(writePath)
      })
    })
    .then(writePath=>this.decryptToBuffer(writePath, options))
    .then(buffer=>{
      fs.unlink(writePath,e=>e)
      return buffer
    })
    .catch(e=>{
      fs.unlink(writePath,e=>e)
      throw e
    })
  }

  /** produces png/jpg images in same folder as pdf
    @pdfPath - The PDF file to make images from
    @options{
      password      : The password to the PDF document.
      imageType=jpg : The image type to write to. Currently only jpg or png.
      outputPrefix  : Name of PDF document The prefix to the image file.
      startPage=1   : The first page to convert, one based.
      endPage=1       : The last page to convert, one based.
      nonSeq        : false Use the new non sequential parser.
    }
  */
  static pdfToImage(pdfPath, options){
    options = options || {}
    options.endPage = 1
    const sArgs = ['-jar', ackPdfBoxJarPath, 'pdftoimage', pdfPath]

    opsOntoSpawnArgs(options, sArgs)

    return this.promiseJavaSpawn(sArgs)
  }

  /** produces png/jpg images in same folder as pdf
    @pdfPath - The PDF file to make images from
    @options{
      password      : The password to the PDF document.
      imageType=jpg : The image type to write to. Currently only jpg or png.
      outputPrefix  : Name of PDF document The prefix to the image file.
      startPage=1   : The first page to convert, one based.
      endPage=1       : The last page to convert, one based.
      nonSeq        : false Use the new non sequential parser.
    }
  */
  static pdfToImages(pdfPath, options){
    const sArgs = ['-jar', ackPdfBoxJarPath, 'pdftoimage', pdfPath]

    opsOntoSpawnArgs(options, sArgs)

    return this.promiseJavaSpawn(sArgs)
  }
}
PdfBoxCliWrap.jarPath = ackPdfBoxJarPath//helpful ref to where Jar file lives

module.exports = PdfBoxCliWrap