import { LightningElement, track } from 'lwc';
import _ from 'lodash';
import j2c from 'json2csv';

export default class App extends LightningElement {
    isSet = false;
    canDownload = false;
    mySess;
    myServ;
    columns = [
        { label: 'sObject API Name', fieldName: 'name' },
        { label: 'Count', fieldName: 'count' }
    ];
    @track tblData = [{ name: 'foo', count: '1' }];

    connectedCallback() {
        this.mySess = this.getCookie('mySess');
        this.myServ = this.getCookie('myServ');
        // var searchParams = new URLSearchParams(window.location.search);

        if (this.mySess != null && this.mySess != '') {
            this.isSet = true;
        }
    }

    handleClick(evt) {
        fetch('/getcounts')
            .then((response) => response.json())
            .then((data) => {
                this.tblData = _.orderBy(data.sObjects, 'count', 'desc');
                this.canDownload = true;
                //console.log(this.tblData);
            });
    }

    downloadCsv(evt) {

        var myData = this.tblData;

        const fields = ['name', 'count'];
        const opts = { fields };

        const csv = j2c.parse(myData, opts);

        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'sf_record_count.csv';
        hiddenElement.click();
    }

    getCookie(name)
    {
        var cookieString = '; ' + document.cookie;
        var parts = cookieString.split('; ' + name + '=');
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }
}
