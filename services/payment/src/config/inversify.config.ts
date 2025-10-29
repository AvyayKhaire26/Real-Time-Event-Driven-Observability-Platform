import { Container } from 'inversify';
import 'reflect-metadata';
import { TYPES, ILogger, IHealthCheck } from '@observability/core';
import { ConsoleLogger, BaseHealthCheck } from '@observability/common';

const container = new Container();

container.bind<ILogger>(TYPES.Logger).toConstantValue(new ConsoleLogger('payment-service'));
container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck('payment-service'));

export { container };
