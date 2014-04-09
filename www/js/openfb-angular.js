/**
 * OpenFB is a micro-library that lets you integrate your JavaScript application with Facebook.
 * OpenFB works for both BROWSER-BASED apps and CORDOVA/PHONEGAP apps.
 * This library has no dependency: You don't need (and shouldn't use) the Facebook SDK with this library. Whe running in
 * Cordova, you also don't need the Facebook Cordova plugin. There is also no dependency on jQuery.
 * OpenFB allows you to login to Facebook and execute any Facebook Graph API request.
 * @author Christophe Coenraets @ccoenraets
 * @version 0.2
 */
angular.module('openfb', [])

    .factory('OpenFB', function ($rootScope, $q, $window, $http) {

        var FB_LOGIN_URL = 'https://www.facebook.com/dialog/oauth',

        // By default we store fbtoken in sessionStorage. This can be overriden in init()
            tokenStore = window.sessionStorage,

            fbAppId,
            oauthRedirectURL,

        // Because the OAuth login spans multiple processes, we need to keep the success/error handlers as variables
        // inside the module instead of keeping them local within the login function.
            deferredLogin,

        // Indicates if the app is running inside Cordova
            runningInCordova,

        // Used in the exit event handler to identify if the login has already been processed elsewhere (in the oauthCallback function)
            loginProcessed;

        document.addEventListener("deviceready", function () {
            runningInCordova = true;
        }, false);

        /**
         * Initialize the OpenFB module. You must use this function and initialize the module with an appId before you can
         * use any other function.
         * @param appId - The id of the Facebook app
         * @param redirectURL - The OAuth redirect URL. Optional. If not provided, we use sensible defaults.
         * @param store - The store used to save the Facebook token. Optional. If not provided, we use sessionStorage.
         */
        function init(appId, redirectURL, store) {
            fbAppId = appId;
            if (redirectURL) oauthRedirectURL = redirectURL;
            if (store) tokenStore = store;
        }

        /**
         * Login to Facebook using OAuth. If running in a Browser, the OAuth workflow happens in a a popup window.
         * If running in Cordova container, it happens using the In-App Browser. Don't forget to install the In-App Browser
         * plugin in your Cordova project: cordova plugins add org.apache.cordova.inappbrowser.
         * @param fbScope - The set of Facebook permissions requested
         */
        function login(fbScope) {

            if (!fbAppId) {
                return error({error: 'Facebook App Id not set.'});
            }

            var loginWindow;

            fbScope = fbScope || '';

            deferredLogin = $q.defer();

            loginProcessed = false;

            logout();

            // Check if an explicit oauthRedirectURL has been provided in init(). If not, infer the appropriate value
            if (!oauthRedirectURL) {
                if (runningInCordova) {
                    oauthRedirectURL = 'https://www.facebook.com/connect/login_success.html';
                } else {
                    // Trying to calculate oauthRedirectURL based on the current URL.
                    var index = document.location.href.indexOf('index.html');
                    if (index > 0) {
                        oauthRedirectURL = document.location.href.substring(0, index) + 'oauthcallback.html';
                    } else {
                        return alert("Can't reliably infer the OAuth redirect URI. Please specify it explicitly in openFB.init()");
                    }
                }
            }

            loginWindow = window.open(FB_LOGIN_URL + '?client_id=' + fbAppId + '&redirect_uri=' + oauthRedirectURL +
                '&response_type=token&display=popup&scope=' + fbScope, '_blank', 'location=no');

            // If the app is running in Cordova, listen to URL changes in the InAppBrowser until we get a URL with an access_token or an error
            if (runningInCordova) {
                loginWindow.addEventListener('loadstart', function (event) {
                    var url = event.url;
                    if (url.indexOf("access_token=") > 0 || url.indexOf("error=") > 0) {
                        loginWindow.close();
                        oauthCallback(url);
                    }
                });

                loginWindow.addEventListener('exit', function () {
                    // Handle the situation where the user closes the login window manually before completing the login process
                    deferredLogin.reject({error: 'user_cancelled', error_description: 'User cancelled login process', error_reason: "user_cancelled"});
                });
            }
            // Note: if the app is running in the browser the loginWindow dialog will call back by invoking the
            // oauthCallback() function. See oauthcallback.html for details.

            return deferredLogin.promise;

        }

        /**
         * Called either by oauthcallback.html (when the app is running the browser) or by the loginWindow loadstart event
         * handler defined in the login() function (when the app is running in the Cordova/PhoneGap container).
         * @param url - The oautchRedictURL called by Facebook with the access_token in the querystring at the ned of the
         * OAuth workflow.
         */
        function oauthCallback(url) {
            // Parse the OAuth data received from Facebook
            var queryString,
                obj;

            loginProcessed = true;
            if (url.indexOf("access_token=") > 0) {
                queryString = url.substr(url.indexOf('#') + 1);
                obj = parseQueryString(queryString);
                tokenStore['fbtoken'] = obj['access_token'];
                deferredLogin.resolve();
            } else if (url.indexOf("error=") > 0) {
                queryString = url.substring(url.indexOf('?') + 1, url.indexOf('#'));
                obj = parseQueryString(queryString);
                deferredLogin.reject(obj);
            } else {
                deferredLogin.reject();
            }
        }

        /**
         * Application-level logout: we simply discard the token.
         */
        function logout() {
            tokenStore['fbtoken'] = undefined;
        }

        /**
         * Helper function to de-authorize the app
         * @param success
         * @param error
         * @returns {*}
         */
        function revokePermissions() {
            return api({method: 'DELETE', path: '/me/permissions'})
                .success(function () {
                    console.log('Permissions revoked');
                });
        }

        /**
         * Lets you make any Facebook Graph API request.
         * @param obj - Request configuration object. Can include:
         *  method:  HTTP method: GET, POST, etc. Optional - Default is 'GET'
         *  path:    path in the Facebook graph: /me, /me.friends, etc. - Required
         *  params:  queryString parameters as a map - Optional
         */
        function api(obj) {

            var method = obj.method || 'GET',
                params = obj.params || {};

            params['access_token'] = tokenStore['fbtoken'];

            return $http({method: method, url: 'https://graph.facebook.com' + obj.path, params: params})
                .error(function(data, status, headers, config) {
                    if (data.error && data.error.type === 'OAuthException') {
                        $rootScope.$emit('OAuthException');
                    }
                });
        }

        /**
         * Helper function for a POST call into the Graph API
         * @param path
         * @param params
         * @returns {*}
         */
        function post(path, params) {
            return api({method: 'POST', path: path, params: params});
        }

        /**
         * Helper function for a GET call into the Graph API
         * @param path
         * @param params
         * @returns {*}
         */
        function get(path, params) {
            return api({method: 'GET', path: path, params: params});
        }

        function parseQueryString(queryString) {
            var qs = decodeURIComponent(queryString),
                obj = {},
                params = qs.split('&');
            params.forEach(function (param) {
                var splitter = param.split('=');
                obj[splitter[0]] = splitter[1];
            });
            return obj;
        }

        return {
            init: init,
            login: login,
            logout: logout,
            revokePermissions: revokePermissions,
            api: api,
            post: post,
            get: get,
            oauthCallback: oauthCallback
        }

    });

// Global function called back by the OAuth login dialog
function oauthCallback(url) {
    var injector = angular.element(document.getElementById('main')).injector();
    injector.invoke(function (OpenFB) {
        OpenFB.oauthCallback(url);
    });
}
