import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const metodosPagoService = new CrudService('metodos_pago', 'id_metodo', true);

export default buildCrudRoutes(metodosPagoService, 'id');
