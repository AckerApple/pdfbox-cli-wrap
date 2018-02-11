# pdfbox-cli-wrap
A wrapper for making PDFBox CLI commands

[![hire me](https://ackerapple.github.io/resume/assets/images/hire-me-badge.svg)](https://ackerapple.github.io/resume/)
[![npm downloads](https://img.shields.io/npm/dm/pdfbox-cli-wrap.svg)](https://npmjs.org/pdfbox-cli-wrap)
[![build status](https://travis-ci.org/AckerApple/pdfbox-cli-wrap.svg)](http://travis-ci.org/AckerApple/pdfbox-cli-wrap)
[![Build status](https://ci.appveyor.com/api/projects/status/r2dj2j87wspg1unk?svg=true)](https://ci.appveyor.com/project/AckerApple/pdfbox-cli-wrap)
[![NPM version](https://img.shields.io/npm/v/pdfbox-cli-wrap.svg?style=flat-square)](https://www.npmjs.com/package/pdfbox-cli-wrap)
[![dependencies](https://david-dm.org/ackerapple/pdfbox-cli-wrap/status.svg)](https://david-dm.org/ackerapple/pdfbox-cli-wrap)

This package allows for the following PDF functionality:

- pages to images
- insert images into pages
- read and fill Acroforms
- certificate and passward security
- timesstamp signing

### Table of Contents
- [Purpose](#purpose)
- [Examples](#examples)
  - [PDF to One Image](#pdf-to-one-image)
  - [PDF to Images](#pdf-to-images)
  - [Add Images](#add-images)
  - [Read Acroform](#read-acroform)
  - [Fill Acroform](#fill-acroform)
  - [Embed Timestamp Signature](#embed-timestamp-signature)
  - [Advanced Fill Acroform](#advanced-fill-acroform)
  - [Encrypt Decrypt by Password](#encrypt-decrypt-by-password)
  - [Encrypt Decrypt by Certificate](#encrypt-decrypt-by-certificate)
- [Installation](#installation)
  - [Install Java](#install-java)
  - [Certificate Based Encrypt Decrypt Install Requirements](#certificate-based-encrypt-decrypt-install-requirements)
    - [Generate Certificates and KeyStore](#generate-certificates-and-keystore)
    - [MAY Need Java Cryptography](#may-need-java-cryptography)
  - [Test Installation](#test-installation)
- [Documentation](#documentation)
  - [getFormFields](#getformfields)
  - [getFormFieldsAsObject](#getformfieldsasobject)
  - [embedFormFields](#embedformfields)
  - [embedFormFieldsByObject](#embedformfieldsbyobject)
  - [sign](#sign)
  - [encrypt](#encrypt)
  - [decrypt](#decrypt)
  - [pdfToImages](#pdftoimages)
  - [pdfToImage](#pdftoimage)
  - [addImages](#addimages)
- [Resources](#resources)
- [Credits](#credits)

## Purpose
Connect to Java and the PDFBox library to allow Node code to perform perfected PDF management techinques.

If you've looked into documentation for secure storage of PDFs, you know you need certificate based security for your PDFs. Next to no public Node libraries have certificate based PDF encryption software.

## Examples

### PDF to One Image
Create one image for the first page of a PDF document. Use pdfToImages to makes images of other pages

```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')

pdfboxCliWrap.pdfToImage(readablePdf)
.then(imgPath=>{
  console.log('jpg image created at: '+imgPath)
})
.catch(e=>console.error(e))
```

### PDF To Images
```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')

pdfboxCliWrap.pdfToImages(readablePdf)
.then(pathArray=>{
  console.log('pdf rendered to files here:', pathArray)
})
.catch(e=>console.error(e))
```

### Add Images
Insert one image at one specific location, or append multiple images, and more...

Example Insert Image File into Page
```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')
const options = {x:200, y:200, page:0, width:100, height:100}

pdfboxCliWrap.addImages(readablePdf, imgPath0, options)
.then(()=>{
  console.log("Image Inserted")
})
.catch(e=>console.error(e))
```

Example Insert Image Base64 into Page
```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')
const options = {x:200, y:200, page:0, width:100, height:100}

pdfboxCliWrap.addImages(readablePdf, 'data:image/png;base64,...', options)
.then(()=>{
  console.log("Base64 Image Inserted")
})
.catch(e=>console.error(e))
```

Example Append Images as Pages
```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')
const options = {
  y:-1,//very top of page
  page:-1,//a new page will be created for image insert
  width:'100%'//width of page to image width will be calclated into a constrained size
}

pdfboxCliWrap.addImages(readablePdf,[imgPath0, imgPath1], options)
.then(()=>{
  console.log("Images Added as Pages to Original PDF File")
})
.catch(e=>console.error(e))
```

### Read Acroform
Read PDf form fields as an array of objects

```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')

pdfboxCliWrap.getFormFields(readablePdf)
.then(fields=>{
  console.log(fields)
})
.catch(e=>console.error(e))
```

The result of getFormFields will look like the following JSON
```javascript
[{
  "fullyQualifiedName": "form1[0].#subform[6].FamilyName[0]",
  "isReadOnly": false,
  "partialName": "FamilyName[0]",
  "type": "org.apache.pdfbox.pdmodel.interactive.form.PDTextField",
  "isRequired": false,
  "page": 6,
  "cords": {
    "x": "39.484",
    "y": "597.929",
    "width": "174.00198",
    "height": "15.119995"
  },
  "value": "Apple"
}]
```

### Fill Acroform
Fill PDf form fields from an array of objects
```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')
const outPdfPath = path.join(__dirname,'filled.pdf')

//array of field values
const data = [{
  "fullyQualifiedName": "Your_FirstName",
  "value": "Acker"
}]

pdfboxCliWrap.embedFormFields(readablePdf, data, outPdfPath, {flatten:true})
.then(()=>{
  console.log("success")
})
.catch(e=>console.error(e))
```

### Advanced Fill Acroform

The JSON file below will fill two fields:

- First field is a plain text field
- Second field will be replaced by a base64 image of a hand-signature
    - **remove** was added to delete field from pdf
    - **base64Overlay** was added to insert hand-signature image where field was
        - **uri** specifies jpg or png image data
        - **forceWidthHeight** forces image to fit with-in field coordinates

```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')
const outPdfPath = path.join(__dirname,'filled.pdf')

//array of field values
const data = [{
  "fullyQualifiedName": "form1[0].#subform[6].FamilyName[0]",
  "isReadOnly": false,
  "partialName": "FamilyName[0]",
  "type": "org.apache.pdfbox.pdmodel.interactive.form.PDTextField",
  "isRequired": false,
  "page": 6,
  "cords": {
    "x": "39.484",
    "y": "597.929",
    "width": "174.00198",
    "height": "15.119995"
  },
  "value": "Apple"
},{
  "fullyQualifiedName": "form1[0].#subform[6].EmployeeSignature[0]",
  "isReadOnly": true,
  "partialName": "EmployeeSignature[0]",
  "type": "org.apache.pdfbox.pdmodel.interactive.form.PDTextField",
  "isRequired": false,
  "page": 6,
  "cords": {
    "x": "126.964",
    "y": "227.523",
    "width": "283.394",
    "height": "15.12001"
  },
  "remove": true,
  "base64Overlay": {
    "uri": "data:image/png;base64,iVBOR......................=",
    "forceWidthHeight": true
  }
}]

pdfboxCliWrap.embedFormFields(readablePdf, data, outPdfPath)
.then(()=>{
  console.log("success")
})
.catch(e=>console.error(e))
```


### Embed Timestamp Signature
```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')

//create paths to pdf files
const path = require('path')
const inPath = path.join(__dirname,'unencrypted.pdf')
const key = path.join(__dirname,'pdfbox-test.p12')

pdfboxCliWrap.signToBuffer(inPath)
.then(buffer=>console.log('signed!'))
.catch(e=>console.error('failed to sign'))
```


### Encrypt Decrypt by Password
A great place to start before moving on to certificate based cryptography

```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')

//create paths to pdf files
const path = require('path')
const inPath = path.join(__dirname,'unencrypted.pdf')
const toPath = path.join(__dirname,'encrypted.pdf')
const decryptTo = path.join(__dirname,'unencrypted2.pdf')

//encrypt
let promise = pdfboxCliWrap.encrypt(inPath, toPath, {'password':'123abc'})
.then( ()=>console.log('encryption success!') )

//decrypt
promise.then( ()=>pdfboxCliWrap.decrypt(toPath, , {'password':'123abc'}) )
.then( ()=>console.log('decryption success!') )
.catch( e=>console.log(e) )
```

### Encrypt Decrypt by Certificate
This is where the money is

```javascript
const pdfboxCliWrap = require('pdfbox-cli-wrap')

//create paths to pdf files
const path = require('path')
const readablePdf = path.join(__dirname,'unencrypted.pdf')
const encryptTo = path.join(__dirname,'encrypted.pdf')
const decryptTo = path.join(__dirname,'unencrypted2.pdf')

//create paths to secret files
const cert = path.join(__dirname,'pdfbox-test.crt')
const key = path.join(__dirname,'pdfbox-test.p12')

//encrypt from readable pdf to unreadable pdf
let promise = pdfboxCliWrap.encrypt(readablePdf, encryptTo, {'certFile':cert})
.then( ()=>console.log('encryption success!') )

//how to decrypt
const decOptions = {
  keyStore:key,//Special file that is password protected. The contents are both the certificate and privatekey.
  password:'password'//unlocks the keyStore file
}

promise.then( ()=>pdfboxCliWrap.decrypt(encryptTo, decryptTo, decOptions) )
.then( ()=>console.log('decryption success!') )
.catch( e=>console.log(e) )
```

> [Learn how to generate .crt and .p12 files here](#generate-certificates-and-keystore)


## Installation
This package is a wrapper for making CLI commands to Java. A few things are going to be needed.

> An updated version of NodeJs that supports ecma6 syntax is required. I believe version 4.0.0 or greater will do. I am in Node 7.0.0, as of this writing, my how time and version numbers can fly.

### Install Java
[Download and Install Java](https://www.java.com/en/download/) and be sure the following command works without error in a command terminal:
```bash
java -version
```

### Certificate Based Encrypt Decrypt Install Requirements
Are you going to be encrypting and possibly decrypting PDF documents?

This is a 1 step process (maybe 2):
- [Generate Certificates and KeyStore](#generate-certificates-and-keystore)
- [MAY Need Java Cryptography](#may-need-java-cryptography)

#### Add BouncyCastle into Java Security Extensions
BouncyCastle is the big daddy of cryptography libraries, for Java and PDFBox

> This step is no longer necessary, IN MOST CASES, as BouncyCastle is now bundled with pdfbox-cli-wrap.
> If you need the BouncyCastle installation documentation, it can be [found here](https://github.com/AckerApple/pdfbox-cli-wrap/blob/master/README-BouncyCastle.md)
>> Bouncy Castle is not a registered provider, when errors like the following occur:  java.io.IOException: Could not find a suitable javax.crypto provider

#### Generate Certificates and KeyStore
Get ready to run terminal commands against Java's keytool. Fun fun

> In a terminal command prompt window, run the following in a folder where certificate files can live

Step #1 Create keyStore
```bash
keytool -genkey -keyalg RSA -alias pdfbox-test-alias -keystore pdfbox-test-keystore.jks -storepass pdfbox-test-password -validity 360 -keysize 2048
```
> creates file pdfbox-test-keystore.jks

Step #2 Create a selfsigned certificate
```bash
keytool -export -alias pdfbox-test-alias -file pdfbox-test.crt -keystore pdfbox-test-keystore.jks
```
> creates file pdfbox-test.crt

Step #3 Marry the certificate and keyStore together as a .p12 file
```bash
keytool -importkeystore -srckeystore pdfbox-test-keystore.jks -destkeystore pdfbox-test.p12 -srcstoretype JKS -deststoretype PKCS12 -deststorepass pdfbox-test-password -srcalias pdfbox-test-alias -destalias pdfbox-test-p12
```
> creates file pdfbox-test.p12

You should now have the following files in targeted folder:

- pdfbox-test.crt
    - used to encrypt
- pdfbox-test-keystore.jks
    - used to create p12 file below
- pdfbox-test.p12
    - used to decrypt


#### MAY Need Java Cryptography
Depending on your level of advanced encryption needs, you (may) need to install [Java Cryptography](http://www.oracle.com/technetwork/java/javase/downloads/jce8-download-2133166.html)


### Test Installation
In the root folder of pdfbox-cli-wrap, in a terminal command window, you can test your installation

Step 1, Install the Test Dependencies (Mocha)
```bash
npm install
```
> The pdfbox-cli-wrap folder should now have a folder named "node_modules" with a folder named "mocha"

Step 2, Run the Test
```bash
npm test
```

## Documentation

### getFormFields

- Returns array of objects
- **pdfPath** - The PDF file to read form fields from

[examples](#read-acroform)

### getFormFieldsAsObject
Read Acroform fields from a PDF as object-of-objects where each key is the fullyQualifiedName of input field

- **pdfPath** - The PDF file to read form fields from

[examples](#read-acroform)

### embedFormFields
Takes array-of-objects and sets values of PDF Acroform fields

- **pdfPath** - The PDF file to read form fields from
- **fieldArray** - Array of PDF field definitions
- **outPdfPath** - Where to write PDF that has been filled
- **options**
  - **flatten** - false. When true, Acroform will no longer be editable


[examples](#fill-acroform)

### embedFormFieldsByObject
Fill Acroform fields from a PDF with an array-of-objects to set the values of input fields

- **pdfPath** - The PDF file to read form fields from
- **fieldArray** - Array of PDF field definitions
- **outPdfPath** - Where to write PDF that has been filled

[examples](#fill-acroform)

### sign
Will embed timestamp signature with optional TSA option

- **pkcs12_keystore** - keystore the pkcs12 keystore containing the signing certificate (typically a .p12 file)
- **password** - the password for recovering the key
- **pdf_to_sign** - the PDF file to sign
- **options**
  - **tsa** - url - sign timestamp using the given TSA server
  - **out** - path - pdf output path
  - **e** - sign using external signature creation scenario

[examples](#embed-timestamp-signature)

### signToBuffer
See [sign](#sign)
```javascript
pdfboxCliWrap.signToBuffer(path,outPath,options).then(buffer).catch()
```

### signByBuffer
See [sign](#sign)
```javascript
pdfboxCliWrap.signByBuffer(buffer,options).then(buffer).catch()
```

### encrypt
Will encrypt a PDF document

- **pdfPath** - The PDF file to encrypt
- **outputPathOrOptions** - The file to save the decrypted document to. If left blank then it will be the same as the input file || options
- **options** - {}
    - **password**:                   The user password to the PDF, ignored if -certFile is specified. (alias of argument U)
    - **O**:                          The owner password to the PDF, ignored if -certFile is specified.
    - **U**:                          The user password to the PDF, ignored if -certFile is specified. (alias of argument password)
    - **certFile**:                   Path to X.509 cert file.
    - **canAssemble**:                true  Set the assemble permission.
    - **canExtractContent**:          true  Set the extraction permission.
    - **canExtractForAccessibility**: true  Set the extraction permission.
    - **canFillInForm**:              true  Set the fill in form permission.
    - **canModify**:                  true  Set the modify permission.
    - **canModifyAnnotations**:       true  Set the modify annots permission.
    - **canPrint**:                   true  Set the print permission.
    - **canPrintDegraded**:           true  Set the print degraded permission.
    - **keyLength**:                  40, 128 or 256  The number of bits for the encryption key. For 128 and above bits Java Cryptography Extension (JCE) Unlimited Strength Jurisdiction Policy Files must be installed.

[examples](#encrypt-decrypt-by-password)

### decrypt
Will decrypt a PDF document

- **pdfPath** - The PDF file to decrypt
- **outputPathOrOptions** - The file to save the decrypted document to. If left blank then it will be the same as the input file || options
- **options** - {}
    - **password**: Password to the PDF or certificate in keystore.
    - **keyStore**: Path to keystore that holds certificate to decrypt the document (typically a .p12 file). This is only required if the document is encrypted with a certificate, otherwise only the password is required.
    - **alias**:    The alias to the certificate in the keystore.

[examples](#encrypt-decrypt-by-certificate)

### pdfToImages
Will create an image for any or every page in a PDF document.

- **pdfPathOrBuffer** - A buffer-of-pdf or pdf-file-path to work with
- **options**
  - **password** - The password to the PDF document.
  - **imageType**=jpg - The image type to write to. Currently only jpg or png.
  - **outputPrefix** - Name of PDF document  The prefix to the image file.
  - **startPage**=1 - The first page to convert, one based.
  - **endPage** - The last page to convert, one based.
  - **nonSeq** - false Use the new non sequential parser.
  - **mode** - "files" or "base64-array" or "buffer-array"

[examples](#pdf-to-one-image)

### pdfToImage
Will create one image for the first page of a PDF document. Use pdfToImages to makes images of other pages

[examples](#pdf-to-one-image)

### addImages
Insert a single image into a PDF or append multi images as individual pages

- **pdfPathOrBuffer** - A buffer-of-pdf or pdf-file-path to work with
- **imagesPath** - The file image(s) to append to document. Allows multiple image arguments, which is great for appending photos as pages. Allows base64 strings.
- **options**
  - **out** - The file to save the decrypted document to. If left blank then it will be the same as the input file || options
  - **page** - The page number where to drop image. Use -1 to append on a new page
  - **x** - The x cord where to drop image
  - **y** - The y cord where to drop image. Use -1 for top
  - **width** - default is image width. Accepts percent width
  - **height** - default is image height

[examples](#add-images)

## Resources

- This whole package is based on [PDFBox CLI](http://pdfbox.apache.org/2.0/commandline.html) documentation
- I had to report and have PDFBox fix a CLI issue to get this package to even work. A version of PDFBox with this fix has been included
    - [Link to fixed issued](https://issues.apache.org/jira/browse/PDFBOX-3551)
- PDF form read and fill is performed by the Java library [ack-pdfbox](https://github.com/AckerApple/ack-pdfbox)


## Credits

- Production Support : [caringpeopleinc.com](http://caringpeopleinc.com/)
