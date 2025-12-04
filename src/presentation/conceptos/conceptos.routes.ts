import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const conceptosService = new CrudService('catalogo_conceptos', 'id_concepto', true);

export default buildCrudRoutes(conceptosService, 'id');
