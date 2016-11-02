# pdfbox-cli-wrap
A wrapper for making PDFBox CLI commands

This packages revolves around PDFBox's Command Line Tools as [seen here](http://pdfbox.apache.org/2.0/commandline.html)

> This wrapper was created specifically for encrypting and decrypting pdf's with certificates. At this time, that is the only supported functionality

### Table of Contents
- [Purpose](#purpose)
- [Examples](#examples)
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
If you've looked into documentation for secure storage of PDFs, you know you need certificate based security for your PDFs. Many third-party websites discourage and make it seem as though you need to rely them for PDF document storage. This is because thier is money in securing documents. Do it yourself. Be a pioneer of and in your time!

## Examples

### Encrypt Decrypt by Password
```
const pdfboxCliWrap = require('pdfbox-cli-wrap')

//create paths to pdf files
const path = require('path')
const inPath = path.join(__dirname,'unencrypted.pdf')
const toPath = path.join(__dirname,'encrypted.pdf')
const decryptTo = path.join(__dirname,'unencrypted2.pdf')

pdfboxCliWrap.encrypt(inPath, toPath, {'password':'123abc'})
.then( ()=>console.log('encryption success!') )
.catch(e=>console.log(e))

pdfboxCliWrap.decrypt(toPath, , {'password':'123abc'})
.then( ()=>console.log('decryption success!') )
.catch(e=>console.log(e))
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
pdfboxCliWrap.encrypt(readablePdf, encryptTo, {'certFile':cert})
.then( ()=>console.log('encryption success!') )
.catch(e=>console.log(e))

const decOptions = {
  keyStore:key,//Special file that is password protected. The contents are both the certificate and privatekey.
  password:'password'//unlocks the keyStore file
}

pdfboxCliWrap.decrypt(encryptTo, decryptTo, decOptions)
.then( ()=>console.log('decryption success!') )
.catch(e=>console.log(e))
```

> [Learn how to generate .crt and .p12 files here](#generate-certificates-and-keystore)

## Installation
This package is a wrapper for making CLI commands to Java. A few things are going to be needed.

### Install Java
[Download and Install Java](https://www.java.com/en/download/) and be sure to following command works without error in a command terminal:
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
    > MORE ABOUT EDIT AND INSERT
    > GOTO middle of security file and look for something like
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
    replace {N} with your next security provider number.
    11 has been used for the example seen above
- Step #3  You may need to restart your computer to restart Java as BouncyCastle should now be installed

> If when encrypting or decrypting you get an error of something like "no suitable crypto library found" then BouncyCastle is NOT installed correctly

### Generate Certificates and KeyStore
Get ready to run terminal commands against Java's keytool. Fun fun

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

### encrypt(pdfPath, outputPathOrOptions, options)
- @pdfPath - The PDF file to encrypt
- @outputPathOrOptions - he file to save the decrypted document to. If left blank then it will be the same as the input file || options
- @options - {}
    - **O**:                          The owner password to the PDF, ignored if -certFile is specified.
    - **U**:                          The user password to the PDF, ignored if -certFile is specified.
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
- @pdfPath - The PDF file to encrypt
- @outputPathOrOptions - The file to save the decrypted document to. If left blank then it will be the same as the input file || options
- @options - {}
    - **password**: Password to the PDF or certificate in keystore.
    - **keyStore**: Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
    - **alias**:    The alias to the certificate in the keystore.


## Resources

- This whole package is based on [PDFBox CLI](http://pdfbox.apache.org/2.0/commandline.html) documentation