import { Container } from 'inversify';
import 'reflect-metadata';
import { TYPES, ILogger, IHealthCheck } from '@observability/core';
import { ConsoleLogger, BaseHealthCheck } from '@observability/common';

const container = new Container();

container.bind<ILogger>(TYPES.Logger).toConstantValue(new ConsoleLogger('print-service'));
container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck('print-service'));

export { container };
