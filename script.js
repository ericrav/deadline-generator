var clientId = '658261560622-ddrg4ivsu92qda9u4i1cnanid965sscd.apps.googleusercontent.com';
var apiKey = 'AIzaSyB3zI1irAMQdxGjf5uwMcz4T14jPPwb_kk';
var scopes = 'https://www.googleapis.com/auth/calendar';

// add function to get date by adding days to date object
// src: http://stackoverflow.com/a/563442/4013322
Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
}

angular.module('dgApp', [])
.filter('encodeDownload', function() {
    return function (input) {
        return encodeURIComponent(JSON.stringify(input));
    };
})
.config( [
    '$compileProvider',
    function ($compileProvider) { // bypass angular href unsafe problem by whitelisting data: links
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|data):/);
        // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
    }
]);
function MainCtrl($scope) {

    $scope.date = '';
    $scope.startDate = '';
    $scope.calendars = []; // array for users calendars
    $scope.templateEvents = [{}];

    //listen for the file selected event
    // src: http://stackoverflow.com/a/4950836/4013322
    $("#choosefile").change(function(e) {
        var files = e.target.files;
        var file = files[0];
        $scope.templateName = file.name;
        if (!window.FileReader) {
            alert("No FileReader. Try again using Google Chrome.");
            return false;
        }
        var reader = new FileReader();
        reader.onload = function() {
            $scope.templateEvents = JSON.parse(this.result);
            $scope.$apply();
        }
        reader.readAsText(file);
    });

    $scope.dateDiff = function (d1, d2) {
        d1 = new Date(d1);
        d2 = new Date(d2);
        return Math.ceil((Math.abs(d1.getTime() - d2.getTime())) / (1000 * 3600 * 24));
    }

    $scope.addTemplateEvent = function() {
        $scope.templateEvents.push({}); // add new event to template
    };

    $scope.deleteTemplateEvent = function(i) {
        if ($scope.templateEvents.length > 1) $scope.templateEvents.splice(i, 1); // don't delete original event (there must be 1)
    };

    $scope.saveTemplate = function () {
        $('#templateModal').modal('hide');
    };

    // src: http://googleappsdeveloper.blogspot.com/2011/12/using-new-js-library-to-unlock-power-of.html
    function handleClientLoad() {
        gapi.client.setApiKey(apiKey);
        window.setTimeout(checkAuth,1);
        checkAuth();
    }

    function checkAuth() {
        gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true},
            handleAuthResult);
    }

    function handleAuthResult(authResult) {
        var authorizeButton = document.getElementById('authorize-button');
        if (authResult) {
            authorizeButton.style.visibility = 'hidden';
            makeApiCall();
        } else {
            authorizeButton.style.visibility = '';
            authorizeButton.onclick = handleAuthClick;
        }
    }

    $scope.handleAuthClick = function(event) {
        gapi.auth.authorize(
            {client_id: clientId, scope: scopes, immediate: false},
            handleAuthResult);
        return false;
    }

    $scope.createEventFromTemplate = function(item) {
        console.log(item);
        // calculate date
        var date;
        if (item.datecalc == 'percent') {
            var p = parseInt(item.templateDate) / 100;
            var days = Math.floor(parseInt($scope.dateDiff($scope.date, $scope.startDate)) * p);
            date = (new Date($scope.startDate)).addDays(days).toJSON().substring(0,10);
        } else if (item.datecalc == 'afterstart') {
            date = (new Date($scope.startDate)).addDays(parseInt(item.templateDate)).toJSON().substring(0,10);
        } else if (item.datecalc == 'beforeend') {
            date = (new Date($scope.date)).addDays(parseInt(item.templateDate) * -1).toJSON().substring(0,10);
        }
        // determine calendar
        var cal;
        if (item.defaultCalendar == '1') cal = $scope.calendar;
        else cal = item.calendarId;
        var summary = item.summary.replace(/%event/g, $scope.title);
        console.log(item.summary);
        var description = item.description.replace(/%event/g, $scope.title);
        console.log(item.description);
        var data = {
            "summary": summary,
            "description": description,
            "end": {
                "date": date
            },
            "start": {
                "date": date
            },
            "source": {
                "url": "http://ericrav.github.io/deadline-generator/"
            }
        };
        // reminders
        if (item.reminder == "1") {
            data.reminders = {
                "overrides": [
                    {
                        "method": "email",
                        "minutes": parseInt(item.reminderDays) * 24 * 60
                    }
                ],
                "useDefault": false
            }
        }
        gapi.client.load('calendar', 'v3', function() {
            var request = gapi.client.calendar.events.insert({
                "calendarId": cal,
                "resource": data
            });
            request.execute(function(res) {
                console.log(res);
            });
        });
    };

    $scope.createEvent = function() {
        // console.log($scope.title);
        // console.log($scope.calendar);
        // console.log($scope.date);
        var data = {
            "summary": $scope.title,
            "end": {
                "date": $scope.date
            },
            "start": {
                "date": $scope.date
            },
            "source": {
                "url": "http://ericrav.github.io/deadline-generator/"
            }
        };
        gapi.client.load('calendar', 'v3', function() {
            var request = gapi.client.calendar.events.insert({
                "calendarId": $scope.calendar,
                "resource": data
            });
            request.execute(function(res) {
                console.log(res);
            });
        });
        for (var i = 0; i < $scope.templateEvents.length; i++) {
            var item = $scope.templateEvents[i];
            $scope.createEventFromTemplate(item);
        }
    }

    function makeApiCall() {
        gapi.client.load('calendar', 'v3', function() {
            var request = gapi.client.calendar.calendarList.list();
            request.execute(function(res) {
                for (var i = 0; i < res.items.length; i++) {
                    var c = res.items[i]; // calendar object
                    if (c.accessRole == 'owner' || c.accessRole == 'writer') $scope.calendars.push(c); // only add if user has write priveleges
                }
                console.log($scope.calendars);
                $scope.$apply();
            });
        });
    }
}