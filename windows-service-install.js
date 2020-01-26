const Service = require('node-windows').Service;
const path = require('path');

let svc = new Service({
    name: 'GetStatus service',
    description: 'For sending SMS to birthday users and email the report',
    script: path.join(__dirname, './service.js')
});

// Listen for the "install" event, which indicates the process is available as a service.
// log is available in the root directory of this project in the daemon folder in getstatusservice.out.log file.
svc.on('install', function () {
    svc.start();
    console.log(svc.name + ' installed.');
});

// Just in case this file is run twice.
svc.on('alreadyinstalled', function () {
    console.log(svc.name + ' is already installed.');
});

// logging any error in the service
svc.on('error', function (err) {
    console.log(err);
});

// Install the script as a service.
svc.install();
