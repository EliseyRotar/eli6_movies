/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initErrorReporter, installErrorLogging } from './src/logging';

installErrorLogging();
initErrorReporter();

AppRegistry.registerComponent(appName, () => App);