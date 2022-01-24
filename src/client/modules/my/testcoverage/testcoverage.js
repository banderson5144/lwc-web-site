import { LightningElement, track } from 'lwc';
import j2c from 'json2csv';

export default class App extends LightningElement {
    success = false;
    isSet = false;
    canDownload = false;
    orgCoverage=0;
    columns = [
        {
            label: 'Apex Class or Trigger name',
            fieldName: 'name'
        },
        {
            label: 'Code Coverage Percentage',
            fieldName: 'coverage',
            cellAttributes: {
                class: {
                    fieldName: 'format'
                }
            }            
        }
    ];
    @track tblData = [{ name: 'foo', coverage: '1%' }];

    connectedCallback() {
        var searchParams = new URLSearchParams(window.location.search);

        if (searchParams != null && searchParams.has('success')) {
            this.isSet = true;
            this.success = searchParams.get('success') === 'true';
        }
    }

    handleClick(evt) {
        fetch('/getcoverage')
            .then((response) => response.json())
            .then((data) => {
                var covTbl = {};
                var newTblData = [];
                for(const rec of data.codeCov.records)
                {
                    if(!covTbl.hasOwnProperty(rec.ApexClassOrTrigger.Name))
                    {
                        covTbl[rec.ApexClassOrTrigger.Name] = {
                            'numLinesCovered':rec.NumLinesCovered,
                            'numLinesUncovered':rec.NumLinesUncovered
                        };
                    }else
                    {
                        covTbl[rec.ApexClassOrTrigger.Name].numLinesCovered+=rec.NumLinesCovered;
                        covTbl[rec.ApexClassOrTrigger.Name].numLinesUncovered+=rec.NumLinesUncovered;
                    }
                }

                for(const p in covTbl)
                {
                    var numLinesCovered = covTbl[p].numLinesCovered;
                    var numLinesUncovered = covTbl[p].numLinesUncovered;

                    if(numLinesCovered == 0 && numLinesUncovered == 0)
                    {
                        newTblData.push({name:p,coverage:'0%',format:'slds-text-color_error'});
                    }else
                    {
                        var cov = parseInt(numLinesCovered/(numLinesCovered+numLinesUncovered)*100);
                        newTblData.push({name:p,coverage:cov+'%',format:(cov>=75?'slds-text-color_success':'slds-text-color_error')});
                    }
                }

                this.orgCoverage = data.orgCov.records[0].PercentCovered;
                this.tblData = newTblData;
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
}