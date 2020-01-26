const Service = require('node-windows').Service;
const path = require('path');

let svc = new Service({
    name: 'GetStatus service',
    description: 'For sending SMS to birthday users and email the report',
    script: path.join(__dirname, './service.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', function () {
    console.log(svc.name + ' uninstalled.');
});

// Uninstall the script as a service.
if(svc.exists){
    svc.uninstall();
}
