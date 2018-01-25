const deleteFiles = true//false
const fs = require('fs')
const pdfboxCliWrap = require('../../index')
const assert = require('assert')
const path = require('path')

const assetPath = path.join(__dirname, '../','assets')
const dec = path.join(assetPath,'unencrypted.pdf')
const dec2 = path.join(assetPath,'unencrypted2.pdf')//file is created at runtime. should never exist otherwise
const enc = path.join(assetPath,'encrypted.pdf')

const cert = path.join(assetPath,'pdfbox-test.crt')
const key = path.join(assetPath,'pdfbox-test.p12')
const base64img = require('./base64img.json')

const isTravis = process.env.TRAVIS
const isRemoteTest = process.env.APPVEYOR || isTravis
const myIt = isTravis ? it.skip : it
const myBouncyIt = isTravis ? it.skip : myIt

if( isRemoteTest ){
  console.log('\x1b[34mRemote testing server detected. Some test will be skipped\x1b[0m')
}


describe('pdfboxCliWrap',function(){
  this.timeout(11000)//decrypt process takes more time than encrypt

  describe('dependencies',()=>{
    it('Java',done=>{
      pdfboxCliWrap.promiseJavaSpawn(['-version'])
      .then(res=>{
        assert.equal(res.search(/java version/)>=0, true)
      })
      .then(done).catch(done)
    })

    it('PDFBox',done=>{
      pdfboxCliWrap.promiseJavaSpawn(['-jar',pdfboxCliWrap.jarPath,'-version'])
      .then(res=>{
        assert.equal(res.search(/PDFBox version/)>=0, true)
      })
      .then(done).catch(done)
    })
  })

  describe('functionality',()=>{
    it('#pdfToImage',done=>{
      const imgPath = path.join(dec,'../','unencrypted1.jpg')
      
      pdfboxCliWrap.pdfToImage(dec)
      .then(x=>{
        assert.equal(fs.existsSync(imgPath), true)
      })
      .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(imgPath):null)
      .then(done).catch(done)
    })

    describe('#pdfToImages',()=>{
      it('mode:files',done=>{
        pdfboxCliWrap.pdfToImages(dec)
        .then(filePaths=>{
          assert.equal(filePaths.length, 1)
          return filePaths[0]
        })
        .then(filePath=>deleteFiles?pdfboxCliWrap.promiseDelete(filePath):null)
        .then(done).catch(done)
      })

      it('mode:base-64-array',done=>{
        pdfboxCliWrap.pdfToImages(dec,{mode:'base64-array'})
        .then(x=>{
          assert.equal(x.length, 1)
        })
        .then(done).catch(done)
      })
    })

    describe('#addImages',()=>{
      it('3 pages of images',done=>{
        const imgPath = path.join(assetPath,'testImage.JPG')
        
        pdfboxCliWrap.addImages(dec, [imgPath,imgPath], {y:-1, page:-1, toBuffer:true})
        .then(buffer=>pdfboxCliWrap.addImages(buffer, imgPath, {y:-1, page:-1, out:dec2}))
        .then(()=>{
          assert.equal(fs.existsSync(dec2), true, "file not found: "+dec2)
        })
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(dec2):null)
        .then(done).catch(done)
      })

      it('add base64 image',done=>{
        pdfboxCliWrap.addImages(dec, [base64img,base64img], {y:-1, page:-1, toBuffer:true})
        .then(buffer=>pdfboxCliWrap.addImages(buffer, base64img, {y:-1, page:-1, out:dec2}))
        .then(()=>{
          assert.equal(fs.existsSync(dec2), true, "file not found: "+dec2)
          if(deleteFiles)return pdfboxCliWrap.promiseDelete(dec2)
        })
        .then(done).catch(done)
      })
    })

    describe('timestamp signatures',()=>{
      const signOps = {keyStore:key,password:'pdfbox-test-password'}

      it('#sign',done=>{
        const imgPath = path.join(dec,'../','unencrypted1.jpg')
        
        if(deleteFiles)fs.unlink(imgPath,e=>e)
        
        pdfboxCliWrap.sign(dec,dec2,signOps)
        .then(()=>assert.equal(fs.existsSync(dec2), true))
        .catch(e=>fakeSigningTest(e))
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(dec2):null)
        .then(done).catch(done)
      })

      it('#sign(tsa)',done=>{
        const imgPath = path.join(dec,'../','unencrypted1.jpg')
        
        if(deleteFiles)fs.unlink(imgPath,e=>e)
        
        const newSignOps = Object.assign({tsa:'http://freetsa.org/tsr'}, signOps)

        pdfboxCliWrap.sign(dec,dec2,newSignOps)
        .then(()=>assert.equal(fs.existsSync(dec2), true))
        .catch(e=>fakeSigningTest(e))
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(dec2):null)
        .then(done).catch(done)
      })
      
    })


    describe("acroforms",()=>{
      it("getFormFields",done=>{
        pdfboxCliWrap.getFormFields(dec)
        .then(fields=>{
          assert.equal(fields.length, 8)
        })
        .then(done).catch(done)
      })

      it("setFormFields",done=>{
        let myFields = {}
        pdfboxCliWrap.getFormFieldsAsObject(dec)
        .then(fields=>{
          myFields = fields
          myFields.Your_Last_Name.value = "Apple"
          myFields.Your_First_Name.value = "Acker"
          myFields.Date.value = "11/09/2016"
          myFields.CheckBox1.value = "Yes"
          myFields.CheckBox2.value = "Off"
          myFields.CheckBox3.value = "Yes"
          myFields.CheckBox4.value = "Off"
          myFields.CheckBox5.value = "Yes"
          return pdfboxCliWrap.embedFormFieldsByObject(dec, myFields, dec2)
        })
        .then(()=>pdfboxCliWrap.getFormFieldsAsObject(dec2))
        .then(fields=>{
          assert.equal(myFields.Your_Last_Name.value, "Apple")
          assert.equal(myFields.Your_First_Name.value, "Acker")
          assert.equal(myFields.Date.value, "11/09/2016")
          assert.equal(myFields.CheckBox1.value, "Yes")
          assert.equal(myFields.CheckBox2.value, "Off")
          assert.equal(myFields.CheckBox3.value, "Yes")
          assert.equal(myFields.CheckBox4.value, "Off")
          assert.equal(myFields.CheckBox5.value, "Yes")
        })
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(dec2):null)
        .then(done).catch(done)
      })
    })

    describe('security',()=>{    
      it('#load',done=>{
        pdfboxCliWrap.decrypt(dec, dec, {'password':'NotEncrypted'})
        .catch(err=>{
          if(err && err.message){
            assert.equal(err.message.search(/Document is not encrypted/i)>=0, true)
            return;
          }

          throw err
        })
        .then(done).catch(done)
      })

      myIt('#encryptToBuffer{password}',done=>{
        const config = {'password':'123abc'}
        pdfboxCliWrap.encryptToBuffer(dec, config)
        .then( buffer=>pdfboxCliWrap.decryptByBuffer(buffer, config) )
        .then( buffer=>pdfboxCliWrap.encryptByBuffer(buffer, config) )
        .then( buffer=>pdfboxCliWrap.decryptByBuffer(buffer, config) )
        .then( buffer=>pdfboxCliWrap.decryptByBuffer(buffer) )//already decrypted, will cause error
        .catch(e=>bouncyCastleTest(e))
        .catch(err=>{
          if(err && err.message){
            assert.equal(err.message.search(/Document is not encrypted/i)>=0, true)
            return;
          }

          throw err
        })
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(enc):null)
        .then(done).catch(done)
      })

      myIt('#encrypt{password}',done=>{
        pdfboxCliWrap.encrypt(dec, enc, {'password':'123abc'})
        .then( ()=>pdfboxCliWrap.decrypt(enc) )
        .catch(e=>{
          if( !e || !e.message || e.message.search(/Cannot decrypt PDF, the password is incorrect/i)<0 ){
            throw e
          }
        })
        .catch(e=>bouncyCastleTest(e))
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(enc):null)
        .then(done).catch(done)
      })

      myIt('#decrypt{password}',done=>{
        const config = {'password':'123abc'}
        pdfboxCliWrap.encrypt(dec, enc, config)
        .then(()=>pdfboxCliWrap.decrypt(enc, config))
        .then( ()=>pdfboxCliWrap.decrypt(enc) )
        .catch(err=>{
          if(err && err.message){
            assert.equal(err.message.search(/Document is not encrypted/i)>=0, true)
            return;
          }

          throw err
        })
        .catch(e=>bouncyCastleTest(e))
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(enc):null)
        .then(done).catch(done)
      })

      myBouncyIt('#encrypt{certFile}',done=>{
        pdfboxCliWrap.encrypt(dec, enc, {'certFile':cert})
        .then( ()=>pdfboxCliWrap.decrypt(enc) )
        .catch(e=>bouncyCastleTest(e))
        .catch(e=>{

          if( !e || !e.message || e.message.search(/Provided decryption material is not compatible with the document/i)<0 ){
            throw e
          }
        })
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(enc):null)
        .then(done).catch(done)
      })

      myBouncyIt('#decrypt{certFile}',done=>{
        pdfboxCliWrap.encrypt(dec, enc, {'certFile':cert})
        .then(()=>pdfboxCliWrap.decrypt(enc, dec2, {keyStore:key, password:'pdfbox-test-password'}))
        .then( ()=>pdfboxCliWrap.decrypt(dec2) )
        .catch(err=>{
          if(err && err.message){
            assert.equal(err.message.search(/Document is not encrypted/i)>=0, true)
            return;
          }

          throw err
        })
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(enc):null)
        .then(()=>deleteFiles?pdfboxCliWrap.promiseDelete(dec2):null)
        .then(done).catch(done)
      })
    })
  })
})

function bouncyCastleTest(err){
  if(err.message && err.message.search('Could not find a suitable javax.crypto')>=0){
    console.error('\x1b[33m---NOTE: Bouncy castle is not installed, skipping test\x1b[0m')
  }

  throw err
}

function fakeSigningTest(err){
  if(err.code==498){
    console.error('\x1b[33m---NOTE: Fake certificate used to test signing has expired. A true test cannot be conducted. Hard to forever test a certificate process. All seems ok otherwise\x1b[0m')
    return
  }

  throw e
}