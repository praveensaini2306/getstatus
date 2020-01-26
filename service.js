const mongo = require('mongodb').MongoClient;
const moment = require('moment');
const express = require('express');

let serviceObject;

class GetStatus {
    url = 'mongodb://localhost:27017/';
    dbName = 'getStatus';
    dateToCompare = null;
    lastExecutionTime = null;
    interval = null;

    constructor(date) {
        // date will come in case of manually service run
        this.dateToCompare = date || moment();

        // starting service
        this.initService();

        // starting service recheck interval as well
        this.startIntervalToRunService();
    }
    
    startIntervalToRunService() {
        // will check after each hour if date is changed
        this.interval = setInterval(() => {
            this.initService();
        }, 60 * 60 * 1000);
    }

    getDate(date) {
        date = date || moment();
        date = date._isMomentObject ? date : moment(date);

        return date.format('YYYY-MM-DD HH:mm:ss');
    }

    initService() {
        if (this.wasLastRunToday()) {
            console.log(`Service can't be started for the same day on ${this.getDate()} again as last execution was on ${this.getDate(this.lastExecutionTime)}`);
            return;
        }
        
        console.log(`service initialized, trying to connect to mongodb server: ${this.getDate()}`);

        mongo.connect(this.url, { useUnifiedTopology: true }, async (error, conn) => {
            if (error) {
                console.log(`Error occurred while establishing connection with mongodb: ${this.getDate()}`);
                throw error;
            }

            console.log(`connection successfully created: ${this.getDate()}`);

            try {
                const dbRef = conn.db(this.dbName);

                // creating users
                // await this.createDummyData(dbRef);

                // starting user search
                await this.startUserSearch(dbRef);
            } catch(ex) {
                console.log(ex);
            } finally {
                conn.close();
            }
        });
    }

    wasLastRunToday() {
        const currentTime = moment();
        const lastTime = this.lastExecutionTime ? moment(this.lastExecutionTime) : null;

        if (lastTime && lastTime.get('date') == currentTime.get('date')
                     && lastTime.get('month') == currentTime.get('month')
                     && lastTime.get('years') == currentTime.get('years')) {
            return true;
        }

        // else save last time
        this.lastExecutionTime = currentTime.toDate();
    }

    // create routes
    async createDummyData(dbRef) {
        console.log(`Creating dummy collections and data: ${this.getDate()}`);
        
        await this.createCollection(dbRef);

        const routes = dbRef.collection('routes');
        
        for (let index = 1, totalRouteCount = 100; index <= totalRouteCount; index++) {
            let response = await routes.insertOne({
                name: `route${index}`
            });
            
            await this.createUsers(dbRef, response.insertedId.toString());
        }
        
        console.log(`Dummy data creation finished: ${this.getDate()}`);
    }

    // create collections
    async createCollections(dbRef) {
        await dbRef.createCollection('routes');
        await dbRef.createCollection('users');
    }

    // create users
    async createUsers(dbRef, routeId) {
        const users = dbRef.collection('users');
        
        for (let index = 1, totalUserCount = 100; index <= totalUserCount; index++) {
            await users.insertOne({
                routeId: routeId,
                email: `user${index}@gmail.com`,
                firstName: `fname${index}`,
                lastName: `lname${index}`,
                cellPhone: `mobileNumber${index}`,
                country: `India`,
                metadata:[
                    { _id: 1, name: 'birthday_date', value: moment({ date: Math.max(1, (index) % 29), month: Math.max(1, (index) % 11), years: 1980 + index }).toDate() },
                    { _id: 2, name: 'anniversary_date', value: ''}
                ]
            });
        }
    }

    async startUserSearch(dbRef) {
        const currentTime = moment();

        console.log(`Searching birthday users started: ${this.getDate(currentTime)}`);
        const reportData = { succeeded: 0, failed: 0 };
        const routesTable = dbRef.collection('routes');
        const usersTable = dbRef.collection('users');
        const dateToCompare = this.dateToCompare;
        const pageSize = 50;

        for (let routesCursor = 0; ; routesCursor += pageSize) {
            const routeRecords = await routesTable.find().skip(routesCursor).limit(pageSize).toArray();
            
            for (const route of routeRecords) {
                let routeId = route._id.toString();
                
                for (let usersCursor = 0; ; usersCursor += pageSize) {
                    const userRecords = await usersTable.find({ routeId }).skip(usersCursor).limit(pageSize).toArray();
                    
                    for (const user of userRecords) {
                        if (user.metadata) {
                            const bDayInfo = user.metadata.find( x => x.name === 'birthday_date');
            
                            if (bDayInfo && bDayInfo.value) {
                                const bDate = moment(bDayInfo.value);
            
                                if (bDate.get('date') == dateToCompare.get('date') && bDate.get('month') == dateToCompare.get('month')) {
                                    // send wish to user
                                    if (await this.sendBirthdaySms(route.name, user)) {
                                        reportData.succeeded++;
                                    } else {
                                        reportData.failed++;
                                    }
                                }
                            }
                        }
                    }

                    if (userRecords.length == 0 || userRecords.length < pageSize) {
                        break;
                    }
                }
            }
            
            if (routeRecords.length == 0 || routeRecords.length < pageSize) {
                break;
            }
        }

        const endTime = moment();

        await this.sendReportStatusEmail(reportData, endTime.diff(currentTime, 'seconds'));
    }

    sendBirthdaySms(routeName, user) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // creating temporary status for the sms sent
                const status = Math.random() * 10 > 4;

                console.log(`${routeName}, ${user.firstName} ${user.lastName}, ${user.cellPhone}, ${status}`);
                resolve(status);
            }, 300);
        });
    }

    sendReportStatusEmail(reportData, executionDuration) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log(`Birthday wish SMS service report for ${this.dateToCompare.format('DD MMMM, YYYY')} is completed in ${executionDuration} seconds with below details: \n  Total birthday users: ${reportData.succeeded + reportData.failed} \n  Messages sent successfully: ${reportData.succeeded} \n  Messages failed: ${reportData.failed}.`);
                resolve();
            }, 300);
        });
    }

    completeService() {
        clearInterval(this.interval);
    }
}

// starting service
serviceObject = new GetStatus();

const app = express();
const port = 3000;

// creating a rest api to execute service
app.use('/api/run-birthday-service', async (req, res, next) => {
	if (serviceObject) {
        // manual run
        serviceObject.initService();
    }
    else {
        let object = new GetStatus();
        object.completeService();
    }

    res.status(200).json({ status: true });
});


// creating server for rest api
app.listen(port, () => {
    console.log(`running server on port ${port}`);
});

