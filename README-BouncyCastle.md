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
