# pdfbox-cli-wrap
A wrapper for making PDFBox CLI commands

This package allows for the following PDF functionality:

- security via certificate
- security via passward
- read forms
- fill forms

### Table of Contents
- [Purpose](#purpose)
- [Examples](#examples)
    - [Read Acroform](#read-acroform)
    - [Fill Acroform](#fill-acroform)
    - [Advanced Fill Acroform](#advanced-fill-acroform)
    - [Encrypt Decrypt by Password](#encrypt-decrypt-by-password)
    - [Encrypt Decrypt by Certificate](#encrypt-decrypt-by-certificate)
- [Installation](#installation)
    - [Install Java](#install-java)
    - [Certificate Based Encrypt Decrypt Install Requirements](#certificate-based-encrypt-decrypt-install-requirements)
        - [Add BouncyCastle into Java Security Extensions](#add-bouncycastle-into-java-security-extensions)
        - [Generate Certificates and KeyStore](#generate-certificates-and-keystore)
        - [MAY Need Java Cryptography](#may-need-java-cryptography)
    - [Test Installation](#test-installation)
- [Documentation](#documentation)
- [Resources](#resources)

## Purpose
Connect to Java and the PDFBox library to allow Node code to perform perfected PDF management techinques.

If you've looked into documentation for secure storage of PDFs, you know you need certificate based security for your PDFs. Next to no public Node libraries have certificate based PDF encryption software.

## Examples

### Read Acroform
Read PDf form fields as an array of objects
```
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')

pdfboxCliWrap.getFormFields(readablePdf)
.then(fields=>{
  console.log(fields)
})
.catch(e=>console.error(e))
```

The result of getFormFields will look like the following JSON
```
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
```
const pdfboxCliWrap = require('pdfbox-cli-wrap')
const readablePdf = path.join(__dirname,'readable.pdf')
const outPdfPath = path.join(__dirname,'filled.pdf')

//array of field values
const data = [{
  "fullyQualifiedName": "Your_FirstName",
  "value": "Acker"
}]

pdfboxCliWrap.embedFormFields(readablePdf, data, outPdfPath)
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

```
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


### Encrypt Decrypt by Password
A great place to start before moving on to certificate based cryptography

```
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
This is where the money is. Requires Java, BouncyCastle and certificates.
```
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
```
java -version
```

### Certificate Based Encrypt Decrypt Install Requirements
Are you going to be encrypting and possibly decrypting PDF documents?

This is a 2 step process (maybe 3):
- [Add BouncyCastle into Java Security Extensions](#add-bouncycastle-into-java-security-extensions)
- [Generate Certificates and KeyStore](#generate-certificates-and-keystore)
- [MAY Need Java Cryptography](#may-need-java-cryptography)

### Add BouncyCastle into Java Security Extensions
BouncyCastle is the big daddy of cryptography libraries, for Java and PDFBox

[BouncyCastle](http://www.bouncycastle.org) Website

An install guide can be found here: [install guide](http://www.bouncycastle.org/wiki/display/JA1/Provider+Installation)

> I recommend installing via the topic: Installing the Provider Statically

:warning: The BouncyCastle install guide just doesn't tell you enough

Here, I'll elaborate on the BouncyCastle install instructions:

- Step #1 Download the [BouncyCastle jar file](http://www.bouncycastle.org/latest_releases.html)
    - I downloaded: [bcprov-ext-jdk15on-155.jar](http://www.bouncycastle.org/download/bcprov-jdk15on-155.jar)
    - The jar file must go into the folder: $JAVA_HOME/jre/lib/ext

- Step #2 You have to edit the file: $JAVA_HOME/jre/lib/security/java.security
    - You must EDIT AND INSERT the following line:
    ```
    security.provider.{N}=org.bouncycastle.jce.provider.BouncyCastleProvider
    ```
        
        - MORE ABOUT EDIT AND INSERT
        - GOTO middle of security file and look for something like
        ```
        security.provider.1=sun.security.provider.Sun
        security.provider.2=sun.security.rsa.SunRsaSign
        security.provider.3=sun.security.ec.SunEC
        security.provider.4=com.sun.net.ssl.internal.ssl.Provider
        security.provider.5=com.sun.crypto.provider.SunJCE
        security.provider.6=sun.security.jgss.SunProvider
        security.provider.7=com.sun.security.sasl.Provider
        security.provider.8=org.jcp.xml.dsig.internal.dom.XMLDSigRI
        security.provider.9=sun.security.smartcardio.SunPCSC
        security.provider.10=apple.security.AppleProvider
        security.provider.11=org.bouncycastle.jce.provider.BouncyCastleProvider
        ```
        
        - replace {N} with your next security provider number
        - security.provider.11 has been used for the example seen above

- Step #3  You may need to restart your computer to restart Java as BouncyCastle should now be installed

:warning: If when encrypting or decrypting you get an error of something like "no suitable crypto library found" then BouncyCastle is NOT installed correctly

### Generate Certificates and KeyStore
Get ready to run terminal commands against Java's keytool. Fun fun

> In a terminal command prompt window, run the following in a folder where certificate files can live

Step #1 Create keyStore
```
keytool -genkey -keyalg RSA -alias pdfbox-test-alias -keystore pdfbox-test-keystore.jks -storepass pdfbox-test-password -validity 360 -keysize 2048
```

Step #2 Create a selfsigned certificate
```
keytool -export -alias pdfbox-test-alias -file pdfbox-test.crt -keystore pdfbox-test-keystore.jks
```

Step #3 Marry the certificate and keyStore together as a .p12 file
```
keytool -importkeystore -srckeystore pdfbox-test-keystore.jks -destkeystore pdfbox-test.p12 -srcstoretype JKS -deststoretype PKCS12 -deststorepass pdfbox-test-password -srcalias pdfbox-test-alias -destalias pdfbox-test-p12
```

You should now have the following files in targeted folder:

- pdfbox-test.crt
- pdfbox-test-keystore.jks
- pdfbox-test.p12

### MAY Need Java Cryptography
Depending on your level of advanced encryption needs, you (may) need to install [Java Cryptography](http://www.oracle.com/technetwork/java/javase/downloads/jce8-download-2133166.html)


### Test Installation
In the root folder of pdfbox-cli-wrap, in a terminal command window, you can test your installation

Step 1, Install the Test Dependencies (Mocha)
```
npm install
```
> The pdfbox-cli-wrap folder should now have a folder named "node_modules" with a folder named "mocha"

Step 2, Run the Test
```
npm test
```

## Documentation


### getFormFields(pdfPath)

- Returns array of objects
- **pdfPath** - The PDF file to read form fields from

### getFormFieldsAsObject(pdfPath)

- Returns object of objects where key is fullyQualifiedName of PDF Acroform field
- **pdfPath** - The PDF file to read form fields from

### embedFormFields(pdfPath, fieldArray, outPdfPath)
Takes array of objects and sets values of PDF Acroform fields

- **pdfPath** - The PDF file to read form fields from
- **fieldArray** - Array of PDF field definitions
- **outPdfPath** - Where to write PDF that has been filled

### embedFormFieldsByObject(pdfPath, fields, outPdfPath)

- Takes objects of objects and sets values of PDF Acroform fields
- **pdfPath** - The PDF file to read form fields from
- **fieldArray** - Array of PDF field definitions
- **outPdfPath** - Where to write PDF that has been filled

### encrypt(pdfPath, outputPathOrOptions, options)
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

### decrypt(pdfPath, outputPathOrOptions, options)
- **pdfPath** - The PDF file to encrypt
- **outputPathOrOptions** - The file to save the decrypted document to. If left blank then it will be the same as the input file || options
- **options** - {}
    - **password**: Password to the PDF or certificate in keystore.
    - **keyStore**: Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
    - **alias**:    The alias to the certificate in the keystore.


## Resources

- This whole package is based on [PDFBox CLI](http://pdfbox.apache.org/2.0/commandline.html) documentation
- I had to report and have PDFBox fix a CLI issue to get this package to even work. A version of PDFBox with this fix has been included
    - [Link to fixed issued](https://issues.apache.org/jira/browse/PDFBOX-3551)
- PDF form read and fill is performed by the Java library [ack-pdfbox](https://github.com/AckerApple/ack-pdfbox)