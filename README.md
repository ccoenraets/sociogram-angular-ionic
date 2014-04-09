# Sociogram for AngularJS / Ionic #

A sample application that demonstrates a lightweight approach to integrate with Facebook in your AngularJS / Ionic apps.


## Getting Started ##

1. Create an Ionic project

2. Add the inappbrowser plugin to your project

   cordova plugins add org.apache.cordova.inappbrowser

3. Replace the www folder of the Ionic project with the www folder in this repository

4. Create a Facebook app here: https://developers.facebook.com/apps. In the advanced settings, make sure you declare a “Valid OAuth redirect URI”. For example, if during development you access your application from http://localhost/openfb/index.html, you must declare http://localhost/openfb/oauthcallback.html as a valid redirect URI. Also add https://www.facebook.com/connect/login_success.html as a Valid OAuth redirect URI for access from Cordova.

5. Copy the Facebook App Id and paste it as the first argument of the OpenFB.init() method invocation in the run() function in app.js.

6. To run the app in the browser: Load index.html, from a location that matches the redirect URI you defined above. For example: http://localhost/openfb/index.html

7. To run the app in Cordova: Build the Ionic project and run it as a Cordova app on your device
