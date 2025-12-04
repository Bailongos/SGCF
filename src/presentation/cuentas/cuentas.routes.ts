import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const cuentasService = new CrudService('cuentas_por_cobrar', 'id_cuenta', true);

export default buildCrudRoutes(cuentasService, 'id');
