# pdfbox-cli-wrap - Change Log
All notable changes to this project will be documented here.

## [1.0.36] - 2018-01-25
- updated packages for security fixes

## [1.0.33] - 2018-01-25
### Added
- Appveyor and Travis testing
### Enhanced
- Testing


## [1.0.32] - 2017-03-22
### Enhanced
- Colorized docs

## [1.0.31] - 2017-01-17
- option.mode of buffer-array to pdfToImages

## [1.0.30] - 2017-01-17
### Added
- option to flatten during pdf-fill
- option.mode of base64-array to pdfToImages

## [1.0.28] - 2017-01-10
### Fix
- temp file naming convention
- file async deletions

## [1.0.26] - 2017-01-10
### Added
- addImages

## [1.0.22] - 2016-12-22
### Added
- sign
- signToBuffer
- signByBuffer

## [1.0.21] - 2016-12-15
### Added
- better error detection
- encryptToBuffer
- encryptByBuffer
- decryptByBuffer
- decryptToBuffer

## [1.0.19] - 2016-12-8
### Added
- pdfToImages and pdfToImage

## [1.0.17] - 2016-11-28
### Updated
- ack-pdfbox which now has BouncyCastle included

## [1.0.15] - 2016-11-28
### Fixed
- ensure temp file is delete regardless of error
- ensure all fs.unlink calls have a callback

## [1.0.14] - 2016-11-18
### Added
- npm dependency instead of github for ack-pdfbox

## [1.0.13] - 2016-11-17
### Fixed
- CLI Stream of large PDFs
- CLI arguments passed to Java
