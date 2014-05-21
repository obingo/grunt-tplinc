/*
 * grunt-include
 * http://pay.qq.com/
 *
 * Copyright (c) 2013 Bingo(xsbchen@tencent.com)
 * Licensed under the MIT license.
 */

module.exports = function (grunt) {
    'use strict';

    var path = require('path');
    var templateCache = {};

    function _parseTemplate(filePath) {
        // 文件不存在，返回空
        if (!grunt.file.isFile(filePath)) {
            return null;
        }

        var templateContent = grunt.file.read(filePath);
        var tplRegexp = /<template[^>]*name=['"]([\S]*?)['"][^>]*>([\s\S]*?)<\/template>/ig;
        var tplMatch;
        var tplCount = 0;
        var result = {};

        while(tplMatch = tplRegexp.exec(templateContent)) {
            result[tplMatch[1]] = tplMatch[2];
            tplCount++;
        }

        // 处理默认值
        if (tplCount === 0) {
            result['default'] = templateContent;
        }

        return result;
    }

    function _getTemplate(templateDir, templateName, defaultFileType) {
        var templateType = path.extname(templateName);
        var templateNameParts = path.basename(templateName, templateType).split(':');

        var templateFileName = templateNameParts[0];
        var templateModuleName = templateNameParts[1] || 'default';

        if (!templateCache[templateFileName]) {
            var templateFilePath = path.join(templateDir, templateFileName) + (templateType || defaultFileType);
            templateCache[templateFileName] = _parseTemplate(templateFilePath) || {};
        }

        var result = templateCache[templateFileName][templateModuleName];
        return typeof result === 'undefined' ? '' : result;
    }

    grunt.registerMultiTask('tplinc', '文件模板引用任务', function () {
        var includeRegexp = /['"]\{include[ \t]+([^\}]*)\}(['"])/ig;
        var options = this.options({
            type: '.html',
            cwd: null
        });

        this.files.forEach(function (filePair) {
            filePair.src.forEach(function (filePath) {
                var targetFileName = filePair.dest ? path.join(filePair.dest, path.basename(filePath)) : filePath;
                var includeDir = options.cwd || path.dirname(filePath);
                var fileContent = grunt.file.read(filePath);
                var trim = filePair.trim || /[\r\n\t]/g;

                // 把trim参数转换为RegExp对象
                if (typeof trim === 'string') {
                    trim = new RegExp(grunt.template.process(trim), 'g');
                }

                fileContent = fileContent.replace(includeRegexp, function (match, templateName, wrapper) {
                    grunt.log.write(filePath.cyan + ' includes ' + templateName.cyan + '...');

                    var tpl = _getTemplate(includeDir, templateName, options.type);

                    grunt.log.writeln(tpl ? 'OK'.green : 'Empty'.red);
                    grunt.verbose.writeln(filePath.cyan + ' -> ' + targetFileName.cyan);

                    tpl = tpl.replace(trim, '').replace(new RegExp(wrapper, 'g'), '\\' + wrapper);
                    return [wrapper, tpl, wrapper].join('');
                });

                // 保存结果
                grunt.file.write(targetFileName, fileContent);
            });

            grunt.log.ok('Processed ' + filePair.src.length + ' files.');
        });
    });
};