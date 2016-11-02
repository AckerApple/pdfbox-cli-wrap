const fs = require('fs')
const pdfboxCliWrap = require('../../index')
const assert = require('assert')
const path = require('path')

const assetPath = path.join(__dirname, '../','assets')
const dec = path.join(assetPath,'unencrypted.pdf')
const dec2 = path.join(assetPath,'unencrypted2.pdf')
const enc = path.join(assetPath,'encrypted.pdf')

const cert = path.join(assetPath,'pdfbox-test.crt')
const key = path.join(assetPath,'pdfbox-test.p12')

describe('pdfboxCliWrap',function(){
  this.timeout(10000)//decrypt process takes more time than encrypt

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

  describe('functionality',function(){
    it('#load',done=>{
      pdfboxCliWrap.decrypt(dec)
      .catch(err=>{
        if(err && err.message){
          assert.equal(err.message.search(/Document is not encrypted/i)>=0, true)
          return;
        }

        throw err
      })
      .then(done).catch(done)
    })

    it('#encrypt{password}',done=>{
      pdfboxCliWrap.encrypt(dec, enc, {'password':'123abc'})
      .then( ()=>pdfboxCliWrap.decrypt(enc) )
      .catch(e=>{
        if( !e || !e.message || e.message.search(/Cannot decrypt PDF, the password is incorrect/i)<0 ){
          throw e
        }
      })
      .then( ()=>fs.unlink(enc) )
      .then(done).catch(done)
    })

    it('#decrypt{password}',done=>{
      pdfboxCliWrap.encrypt(dec, enc, {'password':'123abc'})
      .then(()=>pdfboxCliWrap.decrypt(enc, {'password':'123abc'}))
      .then( ()=>pdfboxCliWrap.decrypt(enc) )
      .catch(err=>{
        if(err && err.message){
          assert.equal(err.message.search(/Document is not encrypted/i)>=0, true)
          return;
        }

        throw err
      })
      .then( ()=>fs.unlink(enc) )
      .then(done).catch(done)
    })

    it('#encrypt{certFile}',done=>{
      pdfboxCliWrap.encrypt(dec, enc, {'certFile':cert})
      .then( ()=>pdfboxCliWrap.decrypt(enc) )
      .catch(e=>{
        if( !e || !e.message || e.message.search(/Provided decryption material is not compatible with the document/i)<0 ){
          throw e
        }
      })
      .then( ()=>fs.unlink(enc) )
      .then(done).catch(done)
    })

    it('#decrypt{certFile}',done=>{
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
      .then( ()=>fs.unlink(enc) )
      .then( ()=>fs.unlink(dec2) )
      .then(done).catch(done)
    })
  })
})