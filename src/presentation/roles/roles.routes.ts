import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const rolesService = new CrudService('roles', 'id_rol', true);

export default buildCrudRoutes(rolesService, 'id');
