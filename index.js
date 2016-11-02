//const Document = require('node-pdfbox');
const path = require('path')
const pdfBoxJarPath = path.join(__dirname,'pdfbox-app-2.0.3.jar')
const fs = require('fs')

function opsOntoSpawnArgs(options, sArgs){
  for(let name in options){
    if(!options[name] || !options[name].split)continue;//value not a string, skip it
    sArgs.push('-'+name)
    sArgs.push(options[name])
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

        const output = dataArray.join()

        if(output.substring(0, 6)=='Error:' || output.substring(0, 9)=='Exception'){
          return rej( upgradeError(output) )
        }

        res( output )
      })
    })
  }

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the decrypted document to. If left blank then it will be the same as the input file || options
    @options - {
      O                          The owner password to the PDF, ignored if -certFile is specified.
      U                          The user password to the PDF, ignored if -certFile is specified.
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
    const sArgs = ['-jar', pdfBoxJarPath, 'Encrypt', pdfPath]

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

  /**
    @pdfPath - The PDF file to encrypt
    @outputPathOrOptions - The file to save the decrypted document to. If left blank then it will be the same as the input file || options
    @options - {
      password Password to the PDF or certificate in keystore.
      keyStore Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
      alias    The alias to the certificate in the keystore.
    }
  */
  static decrypt(pdfPath, outputPathOrOptions, options){
    let args = figureOutAndOptions(outputPathOrOptions, options)
    const sArgs = ['-jar', pdfBoxJarPath, 'Decrypt', pdfPath]

    opsOntoSpawnArgs(args.options, sArgs)

    if(args.outputPath){
      sArgs.push(args.outputPath)
    }

    return this.promiseJavaSpawn(sArgs)
  }
}
PdfBoxCliWrap.jarPath = pdfBoxJarPath

module.exports = PdfBoxCliWrap