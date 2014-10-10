var clientId = '658261560622-ddrg4ivsu92qda9u4i1cnanid965sscd.apps.googleusercontent.com';
var apiKey = 'AIzaSyB3zI1irAMQdxGjf5uwMcz4T14jPPwb_kk';
var scopes = 'https://www.googleapis.com/auth/calendar';

angular.module('dgApp', []);
function MainCtrl($scope) {

    $scope.calendars = []; // array for users calendars

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

    $scope.createEvent = function() {
        console.log($scope.title);
        console.log($scope.calendar);
        console.log($scope.date);
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