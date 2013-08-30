var USERNAME = "Your Username";
var PASSWORD = "Your Password";

var casper = require('casper').create({
//    verbose: true,
//    logLevel: 'debug',
    pageSettings: {
        loadImages: false,         // The WebPage instance used by Casper will
        loadPlugins: false,         // use these settings
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.94 Safari/537.4'
    }
});

var fs = require("fs");

var courseKey = casper.cli.args[0];

if(!courseKey) {
    console.log("ERROR: Please profile course key as an argument.");
    casper.exit();
}

// print out all the messages in the headless browser context
casper.on('remote.message', function (msg) {
//    this.echo('remote message caught: ' + msg);
});

// print out all the messages in the headless browser context
casper.on("page.error", function (msg, trace) {
//    this.echo("Page Error: " + msg, "ERROR");
});

casper.start("https://accounts.coursera.org/signin", function () {
    console.log("Login Page Loaded");
});

casper.then(function () {
    this.waitForSelector("#signin-email", function () {
        this.evaluate(function (username, password) {
            document.querySelector('#signin-email').setAttribute('value', username);
            document.querySelector('#signin-password').setAttribute('value', password);
            document.querySelector("button[type=submit]").click()
        }, USERNAME, PASSWORD);
    });

    console.log("Waiting a bit so login is complete");

    this.wait(1000, function(){});
});
//                 https://class.coursera.org/matrix-001/lecture/index
casper.thenOpen("https://class.coursera.org/"+courseKey+"/lecture/index", function () {

    this.waitForSelector(".course-item-list", function () {
        this.evaluate(function () {
            course = {};
            course.name = jQuery(".course-topbanner-name").text().trim().replace("/", " ");
            course.sections = [];

            var $sections = jQuery(".course-item-list-header");
            $sections.each(function () {
                var $section = jQuery(this);
                var section = {};
                section.name = $section.find("h3").text().trim();
                section.lectures = [];
                var $lectures = $section.next().find("li");
                $lectures.each(function () {
                    var $lecture = jQuery(this);
                    var lecture = {};
                    lecture.name = $lecture.find("a.lecture-link").text().trim();
                    lecture.resources = [];
                    $lecture.find(".course-lecture-item-resource a").each(function () {
                        var aLink = jQuery(this);
                        var resourse = {};
                        resourse.type = aLink.attr("title");
                        resourse.url = aLink.attr("href");
                        lecture.resources.push(resourse);
                    });
                    section.lectures.push(lecture);
                });
                course.sections.push(section);
            });
        });
    }, function() {
        console.log("Login success confirmation timed out :(");
    });
});

casper.then(function () {
    var course = this.getGlobal("course");

    console.log("Downloading Course: ", course.name);

    var coursePath = "courses/" + course.name;

    fs.makeTree(coursePath);

    for(var i = 0, length = course.sections.length; i < length; i++) {
        var section = course.sections[i];
        var sectionPath = coursePath + "/" + (i + 1) + " - " + section.name;
        console.log("sectionPath ", sectionPath);
        fs.makeTree(sectionPath);
        console.log("Downloading ", i+1, " of ", length, " sections");
        for(var j = 0, lecturesLength = section.lectures.length; j < lecturesLength; j++) {
            var lecture = section.lectures[j];
            var lecturePath = sectionPath + "/" + (j+1)  + " - " + lecture.name;

            fs.makeTree(lecturePath);

            for(var k = 0, resourcesLength = lecture.resources.length; k < resourcesLength; k++) {
                var resource = lecture.resources[k];
                switch (resource.type) {
                    case "PDF":
                        casper.download(resource.url, lecturePath + "/" + lecture.name + ".pdf");
                        console.log("Downloading ", lecture.name + ".pdf");
                        break;
                    case "PPT":
                        casper.download(resource.url, lecturePath + "/" + lecture.name + ".pptx");
                        console.log("Downloading ", lecture.name + ".pptx");
                        break;
                    case "Video (MP4)":
                        casper.download(resource.url, lecturePath + "/" + lecture.name + ".mp4");
                        console.log("Downloading ", lecture.name + ".mp4");
                        break;
                }
            }
        }
    }
});


casper.run();
