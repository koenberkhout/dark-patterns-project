import chalk from 'chalk';
import emoji from 'node-emoji';
import { performance } from 'perf_hooks';
import { exit } from 'process';
import App from './app.js';

const startTime = performance.now();

function printStartMessage() {
  process.stdout.write(`${emoji.get('popcorn')} `);
  console.log(chalk.bgYellowBright(`Domaintool started ${new Date().toLocaleTimeString()}\n`));
}

function printFinishedMessage() {
  const elapsedSeconds = Math.round((performance.now() - startTime) / 1000);
  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  process.stdout.write(`\n${emoji.get('checkered_flag')} `);
  console.log(chalk.bgYellowBright(`Domaintool finished ${new Date().toLocaleTimeString()}, elapsed time: ${elapsedSeconds} seconds (≈ ${elapsedMinutes} minutes)`));
}

try {
  printStartMessage();
  await App.start();
  printFinishedMessage();
  exit();
} catch (e) {
  process.stdout.write(`\n${emoji.get('warning')} `);
  console.log(chalk.red(`ACHTUNG:\nAn error occurred while running the program:\n${e}`));
}
