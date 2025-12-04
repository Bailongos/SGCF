import { CrudService } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const usuariosService = new CrudService('usuarios', 'id_usuario', true);

export default buildCrudRoutes(usuariosService, 'id');
