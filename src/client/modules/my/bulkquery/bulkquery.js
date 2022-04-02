import { LightningElement } from 'lwc';

export default class Bulkquery extends LightningElement {
    dynhref;
    soqlStr;

    handleChange(event) {
        this.soqlStr = event.target.value;
    }

    getCookie(name) {
        var cookieString = '; ' + document.cookie;
        var parts = cookieString.split('; ' + name + '=');
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    callQuery() {

        const sfHost = decodeURIComponent(this.getCookie('myServ'));

        fetch('/bulkquery?sfqry='+encodeURIComponent(this.soqlStr))
        .then((response) => response.json())
        .then((data) => {
            console.log(data);
            this.dynhref = sfHost+'/lightning/setup/AsyncApiJobStatus/page?address=%2F'+data.id
        });

    }
}