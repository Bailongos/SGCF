// backend: conceptos.routes.ts
import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

// usamos la tabla conceptos y la columna "clave" como llave **NO numérica**
const conceptosService = new CrudService('conceptos', 'clave', false);

export default buildCrudRoutes(conceptosService, 'id');
