import querystring from 'querystring';
import request from 'request';

export default {
    // Detect if the message is a code block
    isCodeBlock(message) {
        return /^`{1,3}(.*)([\s\S]+)?`{1,3}$/.test(message);
    },

    // Try to grab the code from the start of the code block
    detectCodeType(code) {
        const matches = code.match(/^[`]{1,3}(\w+)/im);

        if (Array.isArray(matches) && matches.length > 0) {
            const typeIndex = CODE_FORMATS.indexOf(matches[1].toLowerCase());

            if (typeIndex > 0)
                return CODE_FORMATS[typeIndex];
        }

        return null;
    },

    // Build the url query used in the request to PasteBin
    buildPastebinQuery(code, senderName, channelName) {
        const codeFormat = this.detectCodeType(code);

        const query = {
            api_option: 'paste',
            api_dev_key: process.env.PASTEBIN_API_KEY,
            api_paste_code: this.formatCodeBlock(code, codeFormat),
            api_paste_name: senderName + ' - ' + channelName,
            api_paste_format: codeFormat || 'text',
            api_paste_private: 0,
            api_paste_expire_date: '1H'
        };

        return query;
    },

    // Submit the code to PasteBin
    createPaste(code, sender, channel) {
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                uri: 'https://pastebin.com/api/api_post.php',
                form: this.buildPastebinQuery(code, sender, channel),
                headers: {
                    'User-Agent': 'TwitchPaster/0.1',
                    'Cache-Control': 'no-cache'
                },
                followRedirect: true
            }, (error, response, body) => {
                if (error) return reject(error);

                if (response.statusCode !== 200)
                    return reject('Unexpected error creating paste!');

                if (body.length === 0)
                    return reject('Empty response!');

                if (body.indexOf('Bad API request') !== -1)
                    return reject('Error: ' + body);

                if (body.indexOf('Post limit') !== -1)
                    return reject('Error: ' + body);

                if (body.indexOf('http') === 0)
                    return resolve(body);

                reject('Unknown Error!');
            });
        });
    },

    // Will remove backticks from the start and end
    formatCodeBlock(code, codeFormat) {
        let matches = code.match(/^`{1,3}/);

        if (Array.isArray(matches) && matches.length > 0)
            code = code.substring(matches[0].length, code.length);

        matches = code.match(/`{1,3}$/);

        if (Array.isArray(matches) && matches.length > 0)
            code = code.substring(0, code.length - matches[0].length);

        if (codeFormat)
            code = code.substring(codeFormat.length, code.length);

        code = code.replace(/\\/g, '\r\n');

        return code.trim();
    },

    getChannel(channel) {
        return (channel.startsWith('#') ? channel.substring(1) : channel);
    }
}

export const CODE_FORMATS = [
    '4cs',
    '6502acme',
    '6502kickass',
    '6502tasm',
    'abap',
    'actionscript',
    'actionscript3',
    'ada',
    'aimms',
    'algol68',
    'apache',
    'applescript',
    'apt_sources',
    'arm',
    'asm',
    'asp',
    'asymptote',
    'autoconf',
    'autohotkey',
    'autoit',
    'avisynth',
    'awk',
    'bascomavr',
    'bash',
    'basic4gl',
    'dos',
    'bibtex',
    'blitzbasic',
    'b3d',
    'bmx',
    'bnf',
    'boo',
    'bf',
    'c',
    'c_winapi',
    'c_mac',
    'cil',
    'csharp',
    'cpp',
    'cpp-winapi',
    'cpp-qt',
    'c_loadrunner',
    'caddcl',
    'cadlisp',
    'ceylon',
    'cfdg',
    'chaiscript',
    'chapel',
    'clojure',
    'klonec',
    'klonecpp',
    'cmake',
    'cobol',
    'coffeescript',
    'cfm',
    'css',
    'cuesheet',
    'd',
    'dart',
    'dcl',
    'dcpu16',
    'dcs',
    'delphi',
    'oxygene',
    'diff',
    'div',
    'dot',
    'e',
    'ezt',
    'ecmascript',
    'eiffel',
    'email',
    'epc',
    'erlang',
    'euphoria',
    'fsharp',
    'falcon',
    'filemaker',
    'fo',
    'f1',
    'fortran',
    'freebasic',
    'freeswitch',
    'gambas',
    'gml',
    'gdb',
    'genero',
    'genie',
    'gettext',
    'go',
    'groovy',
    'gwbasic',
    'haskell',
    'haxe',
    'hicest',
    'hq9plus',
    'html4strict',
    'html5',
    'icon',
    'idl',
    'ini',
    'inno',
    'intercal',
    'io',
    'ispfpanel',
    'j',
    'java',
    'java5',
    'javascript',
    'jcl',
    'jquery',
    'json',
    'julia',
    'kixtart',
    'kotlin',
    'latex',
    'ldif',
    'lb',
    'lsl2',
    'lisp',
    'llvm',
    'locobasic',
    'logtalk',
    'lolcode',
    'lotusformulas',
    'lotusscript',
    'lscript',
    'lua',
    'm68k',
    'magiksf',
    'make',
    'mapbasic',
    'markdown',
    'matlab',
    'mirc',
    'mmix',
    'modula2',
    'modula3',
    '68000devpac',
    'mpasm',
    'mxml',
    'mysql',
    'nagios',
    'netrexx',
    'newlisp',
    'nginx',
    'nim',
    'text',
    'nsis',
    'oberon2',
    'objeck',
    'objc',
    'ocaml-brief',
    'ocaml',
    'octave',
    'oorexx',
    'pf',
    'glsl',
    'oobas',
    'oracle11',
    'oracle8',
    'oz',
    'parasail',
    'parigp',
    'pascal',
    'pawn',
    'pcre',
    'per',
    'perl',
    'perl6',
    'php',
    'php-brief',
    'pic16',
    'pike',
    'pixelbender',
    'pli',
    'plsql',
    'postgresql',
    'postscript',
    'povray',
    'powerbuilder',
    'powershell',
    'proftpd',
    'progress',
    'prolog',
    'properties',
    'providex',
    'puppet',
    'purebasic',
    'pycon',
    'python',
    'pys60',
    'q',
    'qbasic',
    'qml',
    'rsplus',
    'racket',
    'rails',
    'rbs',
    'rebol',
    'reg',
    'rexx',
    'robots',
    'rpmspec',
    'ruby',
    'gnuplot',
    'rust',
    'sas',
    'scala',
    'scheme',
    'scilab',
    'scl',
    'sdlbasic',
    'smalltalk',
    'smarty',
    'spark',
    'sparql',
    'sqf',
    'sql',
    'standardml',
    'stonescript',
    'sclang',
    'swift',
    'systemverilog',
    'tsql',
    'tcl',
    'teraterm',
    'thinbasic',
    'typoscript',
    'unicon',
    'uscript',
    'upc',
    'urbi',
    'vala',
    'vbnet',
    'vbscript',
    'vedit',
    'verilog',
    'vhdl',
    'vim',
    'visualprolog',
    'vb',
    'visualfoxpro',
    'whitespace',
    'whois',
    'winbatch',
    'xbasic',
    'xml',
    'xorg_conf',
    'xpp',
    'yaml',
    'z80',
    'zxbasic',
];