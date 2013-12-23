/*jslint browser: true, regexp: true, unparam: true */
/*global jQuery */

/*
* jQuery Password Strength plugin for Twitter Bootstrap
*
* Copyright (c) 2008-2013 Tane Piper
* Copyright (c) 2013 Alejandro Blanco
* Dual licensed under the MIT and GPL licenses.
*/

(function ($) {
    "use strict";

    var rulesEngine = {},
        validation = {},
        defaultOptions = {},
        ui = {},
        methods = {},
        onKeyUp,
        applyToAll;

    // RULES ENGINE
    // ============

    rulesEngine.forbiddenSequences = [
        "0123456789", "9876543210", "abcdefghijklmnopqrstuvxywz",
        "qwertyuiop", "asdfghjkl", "zxcvbnm"
    ];

    validation.wordNotEmail = function (options, word, score) {
        if (word.match(/^([\w\!\#$\%\&\'\*\+\-\/\=\?\^\`{\|\}\~]+\.)*[\w\!\#$\%\&\'\*\+\-\/\=\?\^\`{\|\}\~]+@((((([a-z0-9]{1}[a-z0-9\-]{0,62}[a-z0-9]{1})|[a-z])\.)+[a-z]{2,6})|(\d{1,3}\.){3}\d{1,3}(\:\d{1,5})?)$/i)) {
            options.instances.errors.push(options.ui.spanError(options, "email_as_password"));
            return score;
        }
    };

    validation.wordLength = function (options, word, score) {
        var wordlen = word.length,
            lenScore = Math.pow(wordlen, options.rules.raisePower);
        if (wordlen < options.common.minChar) {
            lenScore = (lenScore + score);
            options.instances.errors.push(options.ui.spanError(options, "password_too_short"));
        }
        return lenScore;
    };

    validation.wordSimilarToUsername = function (options, word, score) {
        var username = $(options.common.usernameField).val();
        if (username && word.toLowerCase().match(username.toLowerCase())) {
            options.instances.errors.push(options.ui.spanError(options, "same_as_username"));
            return score;
        }
        return false;
    };

    validation.wordTwoCharacterClasses = function (options, word, score) {
        if (word.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/) ||
                (word.match(/([a-zA-Z])/) && word.match(/([0-9])/)) ||
                (word.match(/(.[!,@,#,$,%,\^,&,*,?,_,~])/) && word.match(/[a-zA-Z0-9_]/))) {
            return score;
        }
        options.instances.errors.push(options.ui.spanError(options, "two_character_classes"));
        return false;
    };

    validation.wordRepetitions = function (options, word, score) {
        if (word.match(/(.)\1\1/)) {
            options.instances.errors.push(options.ui.spanError(options, "repeated_character"));
            return score;
        }
        return false;
    };

    validation.wordSequences = function (options, word, score) {
        var found = false,
            j;
        if (word.length > 2) {
            $.each(rulesEngine.forbiddenSequences, function (idx, sequence) {
                for (j = 0; j < (word.length - 3); j += 1) { //iterate the word trough a sliding window of size 3:
                    if (sequence.indexOf(word.toLowerCase().substring(j, j + 3)) > -1) {
                        found = true;
                    }
                }
            });
            if (found) {
                options.instances.errors.push(options.ui.spanError(options, "sequence_found"));
                return score;
            }
        }
        return false;
    };

    validation.wordLowercase = function (options, word, score) {
        return word.match(/[a-z]/) && score;
    };

    validation.wordUppercase = function (options, word, score) {
        return word.match(/[A-Z]/) && score;
    };

    validation.wordOneNumber = function (options, word, score) {
        return word.match(/\d+/) && score;
    };

    validation.wordThreeNumbers = function (options, word, score) {
        return word.match(/(.*[0-9].*[0-9].*[0-9])/) && score;
    };

    validation.wordOneSpecialChar = function (options, word, score) {
        return word.match(/.[!,@,#,$,%,\^,&,*,?,_,~]/) && score;
    };

    validation.wordTwoSpecialChar = function (options, word, score) {
        return word.match(/(.*[!,@,#,$,%,\^,&,*,?,_,~].*[!,@,#,$,%,\^,&,*,?,_,~])/) && score;
    };

    validation.wordUpperLowerCombo = function (options, word, score) {
        return word.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/) && score;
    };

    validation.wordLetterNumberCombo = function (options, word, score) {
        return word.match(/([a-zA-Z])/) && word.match(/([0-9])/) && score;
    };

    validation.wordLetterNumberCharCombo = function (options, word, score) {
        return word.match(/([a-zA-Z0-9].*[!,@,#,$,%,\^,&,*,?,_,~])|([!,@,#,$,%,\^,&,*,?,_,~].*[a-zA-Z0-9])/) && score;
    };

    rulesEngine.validation = validation;

    rulesEngine.executeRules = function (options, word) {
        var totalScore = 0;

        $.each(options.rules.activated, function (rule, active) {
            if (active) {
                var score = options.rules.scores[rule],
                    funct = rulesEngine.validation[rule],
                    result;

                if (!$.isFunction(funct)) {
                    funct = options.rules.extra[rule];
                }

                if ($.isFunction(funct)) {
                    result = funct(options, word, score);
                    if (result) {
                        totalScore += result;
                    }
                }
            }
        });

        return totalScore;
    };

    // OPTIONS
    // =======

    defaultOptions.common = {};
    defaultOptions.common.minChar = 6;
    defaultOptions.common.usernameField = "#username";
    defaultOptions.common.onLoad = undefined;
    defaultOptions.common.onKeyUp = undefined;

    defaultOptions.rules = {};
    defaultOptions.rules.extra = {};
    defaultOptions.rules.scores = {
        wordNotEmail: -100,
        wordLength: -50,
        wordSimilarToUsername: -100,
        wordSequences: -50,
        wordTwoCharacterClasses: 2,
        wordRepetitions: -25,
        wordLowercase: 1,
        wordUppercase: 3,
        wordOneNumber: 3,
        wordThreeNumbers: 5,
        wordOneSpecialChar: 3,
        wordTwoSpecialChar: 5,
        wordUpperLowerCombo: 2,
        wordLetterNumberCombo: 2,
        wordLetterNumberCharCombo: 2
    };
    defaultOptions.rules.activated = {
        wordNotEmail: true,
        wordLength: true,
        wordSimilarToUsername: true,
        wordSequences: true,
        wordTwoCharacterClasses: false,
        wordRepetitions: false,
        wordLowercase: true,
        wordUppercase: true,
        wordOneNumber: true,
        wordThreeNumbers: true,
        wordOneSpecialChar: true,
        wordTwoSpecialChar: true,
        wordUpperLowerCombo: true,
        wordLetterNumberCombo: true,
        wordLetterNumberCharCombo: true
    };
    defaultOptions.rules.raisePower = 1.4;

    defaultOptions.ui = {};
    defaultOptions.ui.bootstrap2 = false;
    defaultOptions.ui.showPopover = false;
    defaultOptions.ui.spanError = function (options, key) {
        var text = options.ui.errorMessages[key];
        return '<span style="color: #d52929">' + text + '</span>';
    };
    defaultOptions.ui.errorMessages = {
        password_too_short: "The Password is too short",
        email_as_password: "Do not use your email as your password",
        same_as_username: "Your password cannot contain your username",
        two_character_classes: "Use different character classes",
        repeated_character: "Too many repetitions",
        sequence_found: "Your password contains sequences"
    };
    defaultOptions.ui.verdicts = ["Weak", "Normal", "Medium", "Strong", "Very Strong"];
    defaultOptions.ui.showVerdicts = true;
    defaultOptions.ui.showErrors = false;
    defaultOptions.ui.container = undefined;
    defaultOptions.ui.viewports = {
        progress: undefined,
        verdict: undefined,
        errors: undefined
    };
    defaultOptions.ui.scores = [14, 26, 38, 50];

    // USER INTERFACE
    // ==============

    ui.getContainer = function (options, $el) {
        var $container;

        $container = $(options.ui.container);
        if (!($container && $container.length === 1)) {
            $container = $el.parent();
        }
        return $container;
    };

    ui.findElement = function ($container, viewport, cssSelector) {
        if (viewport) {
            return $container.find(viewport).find(cssSelector);
        }
        return $container.find(cssSelector);
    };

    ui.getUIElements = function (options, $el) {
        var $container, result;

        if (options.instances.viewports) {
            return options.instances.viewports;
        }

        result = {};
        $container = ui.getContainer(options, $el);
        result.$progressbar = ui.findElement($container, options.ui.viewports.progress, "div.progress");
        if (!options.ui.showPopover) {
            result.$verdict = ui.findElement($container, options.ui.viewports.verdict, "span.password-verdict");
            result.$errors = ui.findElement($container, options.ui.viewports.errors, "ul.error-list");
        }

        options.instances.viewports = result;
        return result;
    };

    ui.initProgressBar = function (options, $el) {
        var $container = ui.getContainer(options, $el),
            progressbar = "<div class='progress'><div class='";

        if (!options.ui.bootstrap2) {
            progressbar += "progress-";
        }
        progressbar += "bar'></div></div>";

        if (options.ui.viewports.progress) {
            $container.find(options.ui.viewports.progress).append(progressbar);
        } else {
            $(progressbar).insertAfter($el);
        }
    };

    ui.initVerdict = function (options, $el) {
        var $container = ui.getContainer(options, $el),
            verdict = "<span class='password-verdict'></span>";

        if (options.ui.viewports.verdict) {
            $container.find(options.ui.viewports.verdict).append(verdict);
        } else {
            $(verdict).insertAfter($el);
        }
    };

    ui.initErrorList = function (options, $el) {
        var $container = ui.getContainer(options, $el),
            errorList = "<ul class='error-list'></ul>";

        if (options.ui.viewports.errors) {
            $container.find(options.ui.viewports.errors).append(errorList);
        } else {
            $(errorList).insertAfter($el);
        }
    };

    ui.initPopover = function (options, $el, verdictText) {
        var placement = "auto top",
            html = "";

        if (options.ui.bootstrap2) { placement = "top"; }

        if (options.ui.showVerdicts && verdictText.length > 0) {
            html = "<h5><span class='password-verdict'>" + verdictText +
                "</span></h5>";
        }
        if (options.ui.showErrors) {
            html += "<div><ul class='error-list'>";
            $.each(options.instances.errors, function (idx, err) {
                html += "<li>" + err + "</li>";
            });
            html += "</ul></div>";
        }

        $el.popover("destroy");
        $el.popover({
            html: true,
            placement: placement,
            trigger: "manual",
            content: html
        });
        $el.popover("show");
    };

    ui.initUI = function (options, $el) {
        if (!options.ui.showPopover) {
            ui.initErrorList(options, $el);
            ui.initVerdict(options, $el);
        }
        // The popover can't be initialized here, it requires to be destroyed
        // and recreated every time its content changes, because it calculates
        // its position based on the size of its content
        ui.initProgressBar(options, $el);
    };

    ui.possibleProgressBarClasses = ["danger", "warning", "success"];

    ui.updateProgressBar = function (options, $el, cssClass, percentage) {
        var $progressbar = ui.getUIElements(options, $el).$progressbar,
            $bar = $progressbar.find(".progress-bar"),
            cssPrefix = "progress-";

        if (options.ui.bootstrap2) {
            $bar = $progressbar.find(".bar");
            cssPrefix = "";
        }

        $.each(ui.possibleProgressBarClasses, function (idx, value) {
            $bar.removeClass(cssPrefix + "bar-" + value);
        });
        $bar.addClass(cssPrefix + "bar-" + cssClass);
        $bar.css("width", percentage + '%');
    };

    ui.updateVerdict = function (options, $el, text) {
        var $verdict = ui.getUIElements(options, $el).$verdict;
        $verdict.text(text);
    };

    ui.updateErrors = function (options, $el) {
        var $errors = ui.getUIElements(options, $el).$errors,
            html = "";
        $.each(options.instances.errors, function (idx, err) {
            html += "<li>" + err + "</li>";
        });
        $errors.html(html);
    };

    ui.percentage = function (score, maximun) {
        var result = Math.floor(100 * score / maximun);
        result = result < 0 ? 0 : result;
        result = result > 100 ? 100 : result;
        return result;
    };

    ui.updateUI = function (options, $el, score) {
        var barCss, barPercentage, verdictText;

        barPercentage = ui.percentage(score, options.ui.scores[3]);
        if (score <= 0) {
            barCss = "danger";
            verdictText = "";
        } else if (score < options.ui.scores[0]) {
            barCss = "danger";
            verdictText = options.ui.verdicts[0];
        } else if (score < options.ui.scores[1]) {
            barCss = "danger";
            verdictText = options.ui.verdicts[1];
        } else if (score < options.ui.scores[2]) {
            barCss = "warning";
            verdictText = options.ui.verdicts[2];
        } else if (score < options.ui.scores[3]) {
            barCss = "warning";
            verdictText = options.ui.verdicts[3];
        } else {
            barCss = "success";
            verdictText = options.ui.verdicts[4];
        }

        ui.updateProgressBar(options, $el, barCss, barPercentage);
        if (options.ui.showPopover) {
            // Popover can't be updated, it has to be recreated
            ui.initPopover(options, $el, verdictText);
        } else {
            if (options.ui.showVerdicts) {
                ui.updateVerdict(options, $el, verdictText);
            }
            if (options.ui.showErrors) {
                ui.updateErrors(options, $el);
            }
        }
    };

    // EVENT HANDLER
    // =============

    onKeyUp = function (event) {
        var $el = $(event.target),
            options = $el.data("pwstrength-bootstrap"),
            word = $el.val(),
            score;

        options.instances.errors = [];
        score = rulesEngine.executeRules(options, word);
        ui.updateUI(options, $el, score);

        if ($.isFunction(options.common.onKeyUp)) {
            options.common.onKeyUp(event);
        }
    };

    // PUBLIC METHODS
    // ==============

    methods.init = function (settings) {
        this.each(function (idx, el) {
            // Make it deep extend (first param) so it extends too the
            // rules and other inside objects
            var clonedDefaults = $.extend(true, {}, defaultOptions),
                localOptions = $.extend(true, clonedDefaults, settings),
                $el = $(el);

            localOptions.instances = {};
            $el.data("pwstrength-bootstrap", localOptions);
            $el.on("keyup", onKeyUp);
            ui.initUI(localOptions, $el);
            if ($.isFunction(localOptions.common.onLoad)) {
                localOptions.common.onLoad();
            }
        });

        return this;
    };

    methods.destroy = function () {
        this.each(function (idx, el) {
            var $el = $(el),
                options = $el.data("pwstrength-bootstrap"),
                elements = ui.getUIElements(options, $el);
            elements.$progressbar.remove();
            elements.$verdict.remove();
            elements.$errors.remove();
            $el.removeData("pwstrength-bootstrap");
        });
    };

    methods.forceUpdate = function () {
        this.each(function (idx, el) {
            var event = { target: el };
            onKeyUp(event);
        });
    };

    methods.addRule = function (name, method, score, active) {
        this.each(function (idx, el) {
            var options = $(el).data("pwstrength-bootstrap");

            options.rules.activated[name] = active;
            options.rules.scores[name] = score;
            options.rules.extra[name] = method;
        });
    };

    applyToAll = function (rule, prop, value) {
        this.each(function (idx, el) {
            $(el).data("pwstrength-bootstrap").rules[prop][rule] = value;
        });
    };

    methods.changeScore = function (rule, score) {
        applyToAll.call(this, rule, "scores", score);
    };

    methods.ruleActive = function (rule, active) {
        applyToAll.call(this, rule, "activated", active);
    };

    $.fn.pwstrength = function (method) {
        var result;

        if (methods[method]) {
            result = methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            result = methods.init.apply(this, arguments);
        } else {
            $.error("Method " +  method + " does not exist on jQuery.pwstrength-bootstrap");
        }

        return result;
    };
}(jQuery));
