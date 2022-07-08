import { exit } from 'process';
import App from './App.js';

await App.start();
console.log('DONE');
exit();
