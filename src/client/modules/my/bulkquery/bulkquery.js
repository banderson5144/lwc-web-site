import { LightningElement, track, api } from 'lwc';
export default class Bulkquery extends LightningElement {
    dynhref;
    soqlStr;
    sObjVal;
    @track sObjOptions;

    @api myserv;
    @api mysess;

    handleChange(event)
    {
        this.soqlStr = event.target.value;
    }

    handleSObjChange(event)
    {
        this.sObjVal = event.detail.value;
    }

    getOptions(event)
    {
        //Call API Defined in server.js file
        // fetch('/globaldescribe')
        // .then((response) => response.json())
        // .then((data) => {
        //     this.sObjOptions = data;
        // });
    }

    getOptionsCORS(event)
    {
        /* Call SF directly hitting this API:
        * https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_describeGlobal.htm
        */

        const myHeaders = new Headers();
        myHeaders.append('Authorization', 'Bearer ' + this.mysess);

        const sfServer =
            decodeURIComponent(this.myserv) +
            '/services/data/v54.0/sobjects/';

        const myRequest = new Request(sfServer, {
            method: 'GET',
            headers: myHeaders,
            mode: 'cors',
            cache: 'default'
        });

        fetch(myRequest)
        .then((response) => response.json())
        .then((data) => {
            //Parse data to populate sObject dropdown
            //Use the 'Name' attribute

            //Use map function to trim sObject array data

            // this.sObjOptions = [
            //     { label: data[...].Name, value: data.[...].Name},
            //     ...
            // ];
        });

    }

    callQuery()
    {

        const sfHost = decodeURIComponent(this.getCookie('myServ'));

        fetch('/bulkquery?sfqry='+encodeURIComponent(this.soqlStr))
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            this.dynhref = sfHost+'/lightning/setup/AsyncApiJobStatus/page?address=%2F'+data.id
        });

    }
}