# getstatus
This service will send birthday with message/email to users on of various projects on their birthday.
# How to run the project
* run npm install in root directory
* run npm start to run the service and start express server so that api with name `http://localhost:3000/api/run-birthday-service` is also available to run the service manually.
* If you want to install the service as window service, please run `node windows-service-install.js` in root directory, it will install the service as window service.
* To uninstall, just run `node windows-service-uninstall.js` in root directory.