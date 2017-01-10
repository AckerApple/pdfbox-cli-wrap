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
    delete args.options.keyStore
    
    sArgs.push(args.options.password)
    delete args.options.password
    
    sArgs.push(pdfPath)
    delete args.options.pdfPath

    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push('-out')
      sArgs.push(args.outputPath)
    }

    return this.promiseJavaSpawn(sArgs)
  }

  static fileToBuffer(readPath, deleteFile){
    return new Promise(function(res,rej){
      fs.readFile(readPath,(err,buffer)=>{
        if(deleteFile){
          fs.unlink(readPath,e=>e)
        }
        
        if(err)return rej(err)
        
        res(buffer)
      })
    })
  }

  /** see sign method */
  static signToBuffer(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const writePath = this.getTempFilePath('pdf', 'tempSign')

    return this.sign(pdfPath, writePath, args.options)
    .then(msg=>this.fileToBuffer(writePath, true))
  }

  /** see sign method */
  static signByBuffer(buffer, options){
    return this.bufferToFile(buffer,'pdf','signByBuffer')
    .then( tempSignPath=>this.signToBuffer(tempSignPath, options) )
  }

  /** Takes array of objects and sets values of PDF Acroform fields
    @pdfPath - The PDF file to read form fields from
    @fieldArray - Array of PDF field definitions
    @outPdfPath - Where to write PDF that has been filled
  */
  static embedFormFields(pdfPath, fieldArray, outPdfPath){
    const jsonFilePath = this.getTempFilePath('json','tempAcroformJson_')
    const sArgs = ['-jar', ackPdfBoxJarPath, 'fill', pdfPath, jsonFilePath, outPdfPath]
    fieldArray = JSON.stringify(fieldArray, null, 2)

    return new Promise(function(res,rej){
      fs.writeFile(jsonFilePath, fieldArray, (err,data)=>{
        if(err)return rej(err)
        res()
      })
    })
    .then(()=>this.promiseJavaSpawn(sArgs))
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
    const encTempPath = this.getTempFilePath('pdf','encryptToBuffer')

    return this.encrypt(pdfPath, encTempPath, options)
    .then(()=>this.fileToBuffer(encTempPath, true))
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
    const decTempPath = this.getTempFilePath('pdf','decryptToBuffer')

    return this.decrypt(pdfPath, decTempPath, options)
    .then(msg=>this.fileToBuffer(decTempPath, true))
  }

  static encryptByBuffer(buffer, options){
    let encTempPath = null
    
    return this.bufferToFile(buffer, 'pdf', 'encryptByBuffer')
    .then(path=>encTempPath=path)
    .then(()=>this.encryptToBuffer(encTempPath, options))
    .then(buffer=>{
      fs.unlink(encTempPath,e=>e)
      return buffer
    })
    .catch(e=>{
      fs.unlink(encTempPath,e=>e)
      throw e
    })

  }

  static getTempFileName(ext, prefix){
    return (prefix||'tempBufferFile') + process.uptime() + '.'+ (ext||'pdf')
  }

  static getTempFilePath(ext, prefix){
    return path.join(process.cwd(), this.getTempFileName(ext, prefix)) 
  }

  static bufferToFile(buffer, ext, prefix){
    const buffTempPath = this.getTempFilePath((ext||'pdf'), (prefix||'bufferToFile'))
    return new Promise(function(res,rej){
      fs.writeFile(buffTempPath,buffer,(err,data)=>{
        if(err)return rej(err)
        res(buffTempPath)
      })
    })
  }

  static decryptByBuffer(buffer, options){
    let wPath = null
    return this.bufferToFile(buffer, 'pdf', 'decryptByBuffer')
    .then(writePath=>wPath=writePath)
    .then(()=>this.decryptToBuffer(wPath, options))
    .then(buffer=>{
      fs.unlink(wPath,e=>e)
      return buffer
    })
    .catch(e=>{
      fs.unlink(wPath,e=>e)
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

  static addImages(pdfPathOrBuffer, imgPathArray, options){
    options = options || {}
    const sArgs = ['-jar', ackPdfBoxJarPath, 'add-image']

    if(pdfPathOrBuffer.constructor==String){
      sArgs.push( pdfPathOrBuffer )
      options.out = options.out || pdfPathOrBuffer//overwrite
    }else{
      options.out = this.getTempFilePath('pdf','addImages')
      options.toBuffer = true;
      throw 'addImages currently only supports string pdf paths'
    }

    if(imgPathArray.constructor==Array){
      sArgs.push.apply(sArgs, imgPathArray)
    }else{
      sArgs.push( imgPathArray )
    }
    
    opsOntoSpawnArgs(options, sArgs)

    let promise = this.promiseJavaSpawn(sArgs)

    if(options.toBuffer){
      promise = promise.then(()=>this.fileToBuffer(options.out, true))
    }

    return promise
  }
}
PdfBoxCliWrap.jarPath = ackPdfBoxJarPath//helpful ref to where Jar file lives

module.exports = PdfBoxCliWrap