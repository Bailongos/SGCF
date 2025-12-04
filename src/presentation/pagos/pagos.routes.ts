import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const pagosService = new CrudService('pagos', 'id_pago', true);

export default buildCrudRoutes(pagosService, 'id');
