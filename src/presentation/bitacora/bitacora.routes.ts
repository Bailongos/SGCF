import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const bitacoraService = new CrudService('bitacora_auditoria', 'id_log', true);

export default buildCrudRoutes(bitacoraService, 'id');
