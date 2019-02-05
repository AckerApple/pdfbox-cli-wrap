"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
//const Document = require('node-pdfbox');
var path = require("path");
//const ack = require('ack-host/ack-node')
//const pdfBoxJarPath = path.join(__dirname,'pdfbox-app-2.0.3.jar')
var ackPdfBoxPath = require.resolve("ack-pdfbox");
var ackPdfBoxJarPath = path.join(ackPdfBoxPath, "../", "dist", "ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar");
//const ackPdfBoxJarPath = path.join(__dirname, "ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
//const pdfBoxJarPath = path.join(__dirname,"ackpdfbox-1.0-SNAPSHOT-jar-with-dependencies.jar")
var fs = require("fs");
function opsOntoSpawnArgs(options, sArgs) {
    for (var name in options) {
        if (!options[name] || !options[name].toString)
            continue; //value not a string, skip it
        sArgs.push('-' + name);
        sArgs.push(options[name].toString());
    }
}
function figureOutAndOptions(outputPathOrOptions, options) {
    var outputPath = '';
    if (outputPathOrOptions) { //2nd arg defined?
        if (outputPathOrOptions.split) { //is string for output path?
            outputPath = outputPathOrOptions;
        }
        else {
            options = outputPathOrOptions; //its actually options
        }
    }
    options = __assign({}, options); //param and clone
    return { options: options, outputPath: outputPath };
}
var Commander = {
    embedFormFields: function (pdfPath, fieldArray, outPdfPath, options) {
        var jsonFilePath = getTempFilePath('json', 'tempAcroformJson_');
        var sArgs = ['-jar', ackPdfBoxJarPath, 'fill', pdfPath, jsonFilePath, outPdfPath];
        if (options && options.flatten) {
            sArgs.push('-flatten');
            sArgs.push('true');
        }
        fieldArray = JSON.stringify(fieldArray, null, 2);
        return new Promise(function (res, rej) {
            fs.writeFile(jsonFilePath, fieldArray, function (err) {
                if (err)
                    return rej(err);
                res({
                    processor: 'embedFormFields',
                    args: sArgs,
                    jsonFilePath: jsonFilePath
                });
            });
        });
    },
    addImages: function (pdfPathOrBuffer, imgPathArray, options) {
        options = options ? __assign({}, options) : {}; //clone
        var sArgs = ['-jar', ackPdfBoxJarPath, 'add-image'];
        var fromFile = pdfPathOrBuffer.constructor == String;
        var toBuffer = false;
        var deleteOut = false;
        var promise = Promise.resolve(pdfPathOrBuffer);
        var tempPath = getTempFilePath('pdf', 'addImages');
        var imagePaths = [];
        var buffDelete = null;
        function cleanup(x) {
            if (deleteOut && options.out == tempPath) {
                fs.unlink(options.out, function (e) { return e; });
            }
            imagePaths.forEach(function (item) {
                if (item.isBase64)
                    fs.unlink(item.path, function (e) { return e; });
            });
            if (buffDelete) {
                fs.unlink(buffDelete, function (e) { return e; });
            }
            return x;
        }
        //discover pdf or buffer to pdf-file
        if (fromFile) {
            sArgs.push(pdfPathOrBuffer);
            deleteOut = options.toBuffer || !options.out;
            options.out = deleteOut ? tempPath : options.out;
        }
        else {
            deleteOut = true;
            toBuffer = !options.out;
            options.out = options.out || tempPath;
            promise = promise.then(function () { return bufferToFile(pdfPathOrBuffer, 'pdf', 'addImages'); })
                .then(function (buffPath) {
                buffDelete = buffPath;
                sArgs.push(buffPath);
            });
        }
        if (options.toBuffer) {
            toBuffer = options.toBuffer;
            delete options.toBuffer;
        }
        //add image args (possibly cast base64 to file)
        return promise.then(function () {
            var promises = [];
            if (imgPathArray.constructor != Array) {
                imgPathArray = [imgPathArray];
            }
            imgPathArray.forEach(function (item) {
                promises.push(imgDefToPath(item)
                    .then(function (imgPath) {
                    imagePaths.push({ path: imgPath, isBase64: item != imgPath });
                    sArgs.push(imgPath);
                }));
            });
            return Promise.all(promises);
        })
            .then(function () {
            opsOntoSpawnArgs(options, sArgs);
            return {
                processor: 'addImages', cleanup: cleanup, args: sArgs,
                toBuffer: toBuffer, deleteOut: deleteOut, out: options.out
            };
        });
    },
    getFormFields: function (pdfPath) {
        return { processor: 'getFormFields', args: ['-jar', ackPdfBoxJarPath, 'read', pdfPath] };
    },
    sign: function (pdfPath, outputPathOrOptions, options) {
        var args = figureOutAndOptions(outputPathOrOptions, options);
        var sArgs = ['-jar', ackPdfBoxJarPath, 'sign'];
        sArgs.push(args.options.keyStore);
        delete args.options.keyStore;
        sArgs.push(args.options.password);
        delete args.options.password;
        sArgs.push(pdfPath);
        delete args.options.pdfPath;
        opsOntoSpawnArgs(args.options, sArgs);
        if (args.outputPath) {
            sArgs.push('-out');
            sArgs.push(args.outputPath);
        }
        return { processor: 'sign', args: sArgs };
    },
    encrypt: function (pdfPath, outputPathOrOptions, options) {
        var args = figureOutAndOptions(outputPathOrOptions, options);
        var sArgs = ['-jar', ackPdfBoxJarPath, 'Encrypt', pdfPath];
        //password is actually -U and must be changed out
        if (args.options.password) {
            args.options.U = args.options.password;
            delete args.options.password;
        }
        opsOntoSpawnArgs(args.options, sArgs);
        if (args.outputPath) {
            sArgs.push(args.outputPath);
        }
        return { processor: 'encrypt', args: sArgs };
    },
    decrypt: function (pdfPath, outputPathOrOptions, options) {
        var args = figureOutAndOptions(outputPathOrOptions, options);
        var sArgs = ['-jar', ackPdfBoxJarPath, 'Decrypt', pdfPath];
        opsOntoSpawnArgs(args.options, sArgs);
        if (args.outputPath) {
            sArgs.push(args.outputPath);
        }
        return { processor: 'decrypt', args: sArgs };
    },
    pdfToImage: function (pdfPath, options) {
        options = options || {};
        options.endPage = 1;
        var sArgs = ['-jar', ackPdfBoxJarPath, 'pdftoimage', pdfPath];
        opsOntoSpawnArgs(options, sArgs);
        return { processor: 'pdfToImage', args: sArgs };
    }
};
var Processor = {
    sign: function (command) {
        return promiseJavaSpawn(command.args)
            .then(function (test) {
            if (test && test.search && test.search('java.security.cert.CertificateExpiredException')) {
                var err = new Error(test);
                err["details"] = "signing certificate is invalid";
                err["code"] = 498;
                throw err;
            }
        });
    },
    addImages: function (command) {
        return promiseJavaSpawn(command.args)
            .then(function (res) { return command.toBuffer ? fileToBuffer(command.out, command.deleteOut) : res; })
            .then(function (x) { return command.cleanup(x); })["catch"](function (e) {
            command.cleanup();
            throw e;
        });
    },
    embedFormFields: function (command) {
        return promiseJavaSpawn(command.args)
            .then(function (data) {
            fs.unlink(command.jsonFilePath, function () { });
            return data;
        })["catch"](function (e) {
            fs.unlink(command.jsonFilePath, function () { });
            throw e;
        });
    }
};
function promiseJavaSpawn(sArgs) {
    return new Promise(function (res, rej) {
        var dataArray = [];
        var spawn = require('child_process').spawn;
        //Hackish and may need eventual change. Real issue is Java outputting extra logging    
        //sArgs.unshift('-Xmx2048m')//set memory to prevent Java verbose log of "Picked up _JAVA_OPTIONS: -Xmx2048m -Xms512m"
        //sArgs.unshift('-Xms512m')//set memory to prevent Java verbose log of "Picked up _JAVA_OPTIONS: -Xmx2048m -Xms512m"
        var ls = spawn('java', sArgs);
        var spawnError = null;
        var upgradeError = function (err) {
            if (!err)
                return err;
            if (err.message) {
                var msg = err.msg;
                msg += '\njava-exec-args:' + JSON.stringify(sArgs);
                err = new Error(msg);
            }
            else if (err.split) {
                var msg = err;
                msg += '\njava-exec-args:' + JSON.stringify(sArgs);
                err = new Error(msg);
            }
            return err;
        };
        ls.stdout.on('data', function (data) { return dataArray.push(data); });
        ls.stderr.on('data', function (data) { return dataArray.push(data); });
        ls.stdout.on('error', function (err) { return spawnError = err; });
        ls.stderr.on('error', function (err) { return spawnError = err; });
        ls.on('close', function (code) {
            if (spawnError) {
                return rej(upgradeError(spawnError));
            }
            var output = dataArray.join(''); //bring all cli data together
            if (output.substring(0, 6) == 'Error:'
                || output.substring(0, 9) == 'Exception'
                || output.substring(0, 6) == 'Usage:'
                || output.search('java.io') >= 0) {
                return rej(upgradeError(output));
            }
            res(output);
        });
    });
}
var PdfBoxCliWrap = /** @class */ (function () {
    function PdfBoxCliWrap() {
    }
    PdfBoxCliWrap.promiseJavaSpawn = function (sArgs) {
        return promiseJavaSpawn(sArgs);
    };
    /** Returns array of objects
    @pdfPath - The PDF file to read form fields from
    */
    PdfBoxCliWrap.getFormFields = function (pdfPath) {
        var sArgs = Commander.getFormFields(pdfPath).args;
        return promiseJavaSpawn(sArgs)
            .then(function (res) { return trimJavaResponseToJson(res); })
            .then(function (data) {
            data = data.trim();
            if (data.substring(data.length - 1) == ',') {
                data = data.substring(0, data.length - 1); //somehow a comma is being added?
            }
            return JSON.parse(data);
        });
    };
    /** Returns object of objects where key is fullyQualifiedName of PDF Acroform field
    @pdfPath - The PDF file to read form fields from
    */
    PdfBoxCliWrap.getFormFieldsAsObject = function (pdfPath) {
        return this.getFormFields(pdfPath)
            .then(function (data) {
            var rtnOb = {};
            for (var x = 0; x < data.length; ++x) {
                rtnOb[data[x].fullyQualifiedName] = data[x];
            }
            return rtnOb;
        });
    };
    /**
      @pdfPath - The PDF file to encrypt
      @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
      @options{
        password Password to the PDF or certificate in keystore.
        keyStore Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
        tsa
      }
  
    */
    PdfBoxCliWrap.sign = function (pdfPath, outputPathOrOptions, options) {
        var command = Commander.sign(pdfPath, outputPathOrOptions, options);
        return Processor.sign(command);
    };
    /** see sign method */
    PdfBoxCliWrap.signToBuffer = function (pdfPath, outputPathOrOptions, options) {
        var args = figureOutAndOptions(outputPathOrOptions, options);
        var writePath = getTempFilePath('pdf', 'tempSign');
        return this.sign(pdfPath, writePath, args.options)
            .then(function (msg) { return fileToBuffer(writePath, true); });
    };
    /** see sign method */
    PdfBoxCliWrap.signByBuffer = function (buffer, options) {
        var _this = this;
        var writePath = null;
        return bufferToFile(buffer, 'pdf', 'signByBuffer')
            .then(function (tempSignPath) { return writePath = tempSignPath; })
            .then(function () { return _this.signToBuffer(writePath, options); })
            .then(function (data) {
            fs.unlink(writePath, function (e) { return e; });
            return data;
        })["catch"](function (e) {
            fs.unlink(writePath, function (e) { return e; });
            throw e;
        });
    };
    /** Takes array of objects and sets values of PDF Acroform fields
      @pdfPath - The PDF file to read form fields from
      @fieldArray - Array of PDF field definitions
      @outPdfPath - Where to write PDF that has been filled
      @options - {
        flatten:false
      }
    */
    PdfBoxCliWrap.embedFormFields = function (pdfPath, fieldArray, outPdfPath, options) {
        return Commander.embedFormFields(pdfPath, fieldArray, outPdfPath, options)
            .then(function (command) { return Processor.embedFormFields(command); });
    };
    /** Takes objects of objects and sets values of PDF Acroform fields
    @pdfPath - The PDF file to read form fields from
    @fieldArray - Array of PDF field definitions
    @outPdfPath - Where to write PDF that has been filled
    */
    PdfBoxCliWrap.embedFormFieldsByObject = function (pdfPath, fields, outPdfPath) {
        var fieldArray = [];
        for (var x in fields) {
            fieldArray.push(fields[x]);
        }
        return this.embedFormFields(pdfPath, fieldArray, outPdfPath);
    };
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
    PdfBoxCliWrap.encrypt = function (pdfPath, outputPathOrOptions, options) {
        var sArgs = Commander.encrypt(pdfPath, outputPathOrOptions, options).args;
        return promiseJavaSpawn(sArgs)
            .then(function (res) { return trimJavaResponseToJson(res); });
    };
    PdfBoxCliWrap.encryptToBuffer = function (pdfPath, options) {
        var args = figureOutAndOptions(options);
        var encTempPath = getTempFilePath('pdf', 'encryptToBuffer');
        return this.encrypt(pdfPath, encTempPath, options)
            .then(function () { return fileToBuffer(encTempPath, true); });
    };
    /**
      @pdfPath - The PDF file to encrypt
      @outputPathOrOptions - The file to save the document to. If left blank then it will be the same as the input file || options
      @options - {
        password Password to the PDF or certificate in keystore.
        keyStore Path to keystore that holds certificate to decrypt the document. This is only required if the document is encrypted with a certificate, otherwise only the password is required.
        alias    The alias to the certificate in the keystore.
      }
    */
    PdfBoxCliWrap.decrypt = function (pdfPath, outputPathOrOptions, options) {
        var sArgs = Commander.decrypt(pdfPath, outputPathOrOptions, options).args;
        return promiseJavaSpawn(sArgs)
            .then(function (res) { return trimJavaResponseToJson(res); });
    };
    PdfBoxCliWrap.decryptToBuffer = function (pdfPath, options) {
        var args = figureOutAndOptions(options);
        var decTempPath = getTempFilePath('pdf', 'decryptToBuffer');
        return this.decrypt(pdfPath, decTempPath, options)
            .then(function (msg) { return fileToBuffer(decTempPath, true); });
    };
    PdfBoxCliWrap.encryptByBuffer = function (buffer, options) {
        var _this = this;
        var encTempPath = null;
        return bufferToFile(buffer, 'pdf', 'encryptByBuffer')
            .then(function (path) { return encTempPath = path; })
            .then(function () { return _this.encryptToBuffer(encTempPath, options); })
            .then(function (buffer) {
            fs.unlink(encTempPath, function (e) { return e; });
            return buffer;
        })["catch"](function (e) {
            fs.unlink(encTempPath, function (e) { return e; });
            throw e;
        });
    };
    PdfBoxCliWrap.decryptByBuffer = function (buffer, options) {
        var _this = this;
        var wPath = null;
        return bufferToFile(buffer, 'pdf', 'decryptByBuffer')
            .then(function (writePath) { return wPath = writePath; })
            .then(function () { return _this.decryptToBuffer(wPath, options); })
            .then(function (buffer) {
            fs.unlink(wPath, function (e) { return e; });
            return buffer;
        })["catch"](function (e) {
            fs.unlink(wPath, function (e) { return e; });
            throw e;
        });
    };
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
    PdfBoxCliWrap.pdfToImage = function (pdfPath, options) {
        var sArgs = Commander.pdfToImage(pdfPath, options).args;
        return promiseJavaSpawn(sArgs).then(function (paths) { return paths[0]; });
    };
    /** produces png/jpg images in same folder as pdf
      @pdfPathOrBuffer - A buffer-of-pdf or pdf-file-path to work with
      @options{
        password      : The password to the PDF document.
        imageType=jpg : The image type to write to. Currently only jpg or png.
        outputPrefix  : Name of PDF document The prefix to the image file.
        startPage=1   : The first page to convert, one based.
        endPage=1     : The last page to convert, one based.
        nonSeq        : false Use the new non sequential parser.
        mode          : default=files, base64-array, buffer-array
      }
    */
    PdfBoxCliWrap.pdfToImages = function (pdfPathOrBuffer, options) {
        var fromFile = pdfPathOrBuffer.constructor == String;
        var buffDelete = null;
        var sArgs = ['-jar', ackPdfBoxJarPath, 'pdftoimage'];
        var promise = Promise.resolve(pdfPathOrBuffer);
        var fileprefix = '';
        if (fromFile) {
            fileprefix = pdfPathOrBuffer.split(path.sep).pop();
            sArgs.push(pdfPathOrBuffer);
        }
        else {
            promise = promise.then(function (buffer) { return bufferToFile(buffer, 'pdf', 'pdfToImages'); })
                .then(function (buffPath) {
                buffDelete = buffPath;
                fileprefix = buffPath.split(path.sep).pop();
                sArgs.push(buffPath);
            });
        }
        options = options || {};
        var mode = options.mode ? options.mode : 'files';
        var imgSuffix = options.imageType || 'jpg';
        delete options.mode;
        promise = promise.then(function () {
            opsOntoSpawnArgs(options, sArgs);
            return promiseJavaSpawn(sArgs);
        })
            .then(function (res) { return trimJavaResponseToJson(res); })
            .then(function (res) { return JSON.parse(res); });
        switch (mode) {
            case 'base64-array':
                promise = promise.then(imgPathArrayToBase64s);
                break;
            case 'buffer-array':
                promise = promise.then(imgPathArrayToBuffers);
                break;
        }
        function cleanup(input) {
            if (buffDelete) {
                fs.unlink(buffDelete, function (e) { return e; });
            }
            return input;
        }
        return promise["catch"](function (e) {
            cleanup();
            throw e;
        })
            .then(cleanup);
    };
    /** Insert a single image into a PDF or append multi images as individual pages
      @pdfPathOrBuffer - A buffer-of-pdf or pdf-file-path to work with
      @imagesPath - The file image(s) to append to document. Allows multiple image arguments, which is great for appending photos as pages. Allows base64 strings.
      @options{
        out    : The file to save the decrypted document to. If left blank then it will be the same as the input file || options
        page   : The page number where to drop image. Use -1 to append on a new page
        x      : The x cord where to drop image
        y      : The y cord where to drop image. Use -1 for top
        width  : default is image width. Accepts percent width
        height : default is image height
      }
    */
    PdfBoxCliWrap.addImages = function (pdfPathOrBuffer, imgPathArray, options) {
        var promise = Commander.addImages(pdfPathOrBuffer, imgPathArray, options);
        var command = { cleanup: function () { return 0; } }; //foo
        return promise.then(function (command) { return Processor.addImages(command); });
    };
    PdfBoxCliWrap.promiseDelete = function (path, ignoreFileNotFound) {
        return new Promise(function (res, rej) {
            fs.unlink(path, function (e) {
                if (e) {
                    if (e.message && e.message.indexOf('ENOENT') >= 0) {
                        return res(); //file didn't exist
                    }
                    return rej(e);
                }
                res();
            });
        });
    };
    PdfBoxCliWrap.jarPath = ackPdfBoxJarPath; //helpful ref to where Jar file lives
    return PdfBoxCliWrap;
}());
exports.PdfBoxCliWrap = PdfBoxCliWrap;
var tempCounter = 0;
function getTempFileName(ext, prefix) {
    return '_' + (prefix || 'tempBufferFile') + (++tempCounter) + '.' + (ext || 'pdf');
}
function getTempFilePath(ext, prefix) {
    return path.join(process.cwd(), getTempFileName(ext, prefix));
}
var base64ImgDef = 'data:image/';
function isBase64Image(item) {
    return item.substring(0, base64ImgDef.length) == base64ImgDef;
}
function base64ToFile(item) {
    var extDef = item.substring(base64ImgDef.length, base64ImgDef.length + 4);
    var ext = extDef.split(';')[0];
    var base64 = item.replace(/^[^,]+,/, "");
    item = getTempFilePath(ext, 'imgDefToPath');
    return new Promise(function (res, rej) {
        fs.writeFile(item, base64, 'base64', function (err) {
            if (err)
                return rej(err);
            res(item);
        });
    });
}
function imgDefToPath(item) {
    var isBase64 = isBase64Image(item);
    var promise = Promise.resolve(item);
    if (isBase64) {
        promise = promise.then(function (item) { return base64ToFile(item); });
    }
    return promise;
}
function imgPathArrayToBuffers(imgFiles) {
    var promises = [];
    imgFiles.forEach(function (imgPath) {
        var promise = new Promise(function (res, rej) {
            fs.readFile(imgPath, function (err, data) {
                if (err)
                    return rej(err);
                res(data);
            });
        })
            .then(function (data) {
            fs.unlink(imgPath, function (e) { return e; });
            return data;
        });
        promises.push(promise);
    });
    return Promise.all(promises);
}
function imgPathArrayToBase64s(imgFiles) {
    return imgPathArrayToBuffers(imgFiles)
        .then(function (buffers) { return buffers.map(bufferToString); });
}
function bufferToString(buffer) {
    return buffer.toString('base64');
}
function bufferToFile(buffer, ext, prefix) {
    var buffTempPath = getTempFilePath((ext || 'pdf'), (prefix || 'bufferToFile'));
    return new Promise(function (res, rej) {
        fs.writeFile(buffTempPath, buffer, function (err) {
            if (err)
                return rej(err);
            res(buffTempPath);
        });
    });
}
function fileToBuffer(readPath, deleteFile) {
    return new Promise(function (res, rej) {
        fs.readFile(readPath, function (err, buffer) {
            if (deleteFile) {
                fs.unlink(readPath, function (e) { return e; });
            }
            if (err)
                return rej(err);
            res(buffer);
        });
    });
}
/** hack to remove JAVA verbose logging.
  TODO: we need to turn off verbose logging
  CAUSE: Sometimes we are getting Java extra message of "Picked up _JAVA_OPTIONS: -Xmx2048m -Xms512m"
*/
function trimJavaResponseToJson(string) {
    if (string.search('Picked up _JAVA_OPTIONS') >= 0) {
        return string.replace(/^[^\[\{]*/, '');
    }
    return string;
}
