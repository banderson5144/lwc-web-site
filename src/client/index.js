import '@lwc/synthetic-shadow';
import MyApp from 'my/app';
import { createElement } from 'lwc';

const app = createElement('my-app', { is: MyApp });
// eslint-disable-next-line @lwc/lwc/no-document-query
document.querySelector('#main').appendChild(app);
