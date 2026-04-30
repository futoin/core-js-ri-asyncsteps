import js from "@eslint/js";
import jsdoc from 'eslint-plugin-jsdoc';
import globals from "globals";

export default [
    js.configs.recommended,
    jsdoc.configs['flat/recommended-error'],
    {
        plugins: {
            jsdoc,
        },
        languageOptions: {
            sourceType: "script",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: {
                    impliedStrict: false,
                },
            },
        },
        "rules": {
            "strict": "off",
            "indent": [
                "error",
                4
            ],
            "linebreak-style": [
                "error",
                "unix"
            ],
            "quotes": ["off"],
            "semi": ["error", "always"],
            "strict": ["error", "global"],
            "comma-dangle": ["error", "always-multiline"],
            "comma-spacing": ["error", { "before": false, "after": true }],
            "comma-style": ["error", "last"],
            "jsdoc/require-returns": ["off"],
            "jsdoc/require-jsdoc": "error",
            "jsdoc/reject-any-type": ["off"],
            "no-template-curly-in-string": ["error"],
            "curly": ["error", "multi-line"],
            "no-multi-spaces": ["error"],
            //"array-bracket-newline": ["error", { "multiline": true, "minItems": 3 }],
            "array-bracket-spacing": ["error", "always"],
            //"array-element-newline": ["error", { "multiline": true, "minItems": 3 }],
            "block-spacing": ["error"],
            "brace-style": ["error", "1tbs"],
            "no-trailing-spaces": "error",
            "no-unused-vars": [
                "error",
                {
                    "vars" : "all",
                    "args" : "all",
                    "argsIgnorePattern" : "^(as|err|_.*)$"
                }
            ],
            "no-useless-concat": "error",
            "no-useless-return": "error",
            "no-useless-escape": "error",
            // "object-curly-newline": ["error", { "multiline": true }],
            "object-curly-spacing": ["error", "always"],
            //"object-property-newline": "error",
            "one-var": ["error", "never"],
            "padded-blocks": ["error", "never"],
            "padding-line-between-statements": [
                "error",
                { "blankLine": "always", "prev": "*", "next": ["for", "while", "do", "class", "if", "switch", "try", "with"] },
                { "blankLine": "always", "prev": ["for", "while", "do", "class", "if", "switch", "try", "with"], "next": "*" },
                
                { "blankLine": "always", "prev": "var", "next": "*" },
                { "blankLine": "any", "prev": "var", "next": "var" },
            ],
            "space-before-blocks": "error",
            "space-before-function-paren": ["error", {
                "anonymous": "never",
                "named": "never",
                "asyncArrow": "always"
            }],
            "space-in-parens": ["error", "always"],
            "quote-props": ["error", "as-needed"],
            "wrap-regex": "error",
        },
    },
    {
        files: [ "lib/browser*.js" ],
        languageOptions: {
            globals: {
                ...globals.browser,
            }
        },
        rules: {
            strict: [ "error", "function" ],
            "no-console" : ["off"],
            "brace-style": ["off"],
        },
    },
    {
        files: [ "test/**/*.js" ],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.mocha,
            }
        },
        rules: {
            "no-console" : ["off"],
            "no-unused-vars": ["off"],
            "jsdoc/require-jsdoc" : ["off"],
        },
    },
];
