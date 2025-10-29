import { Container } from 'inversify';
import 'reflect-metadata';
import { TYPES, ILogger, IHealthCheck } from '@observability/core';
import { ConsoleLogger, BaseHealthCheck } from '@observability/common';

const container = new Container();

// Bind infrastructure
container.bind<ILogger>(TYPES.Logger).toConstantValue(new ConsoleLogger('api-gateway'));
container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck('api-gateway'));

export { container };
