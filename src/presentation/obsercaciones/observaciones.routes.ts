import { CrudService, CrudOptions } from '../../services/crud.service';
import { buildCrudRoutes } from '../shared/crud.routes';

const observacionesService = new CrudService('observaciones', 'id_observacion', true);

export default buildCrudRoutes(observacionesService, 'id', {
  resolveScope: (req: any): CrudOptions | undefined => {
    const user = req.user;
    if (user?.id_carrera) {
      return {
        scopeParams: {
          tableField: `(SELECT id_carrera FROM "control financiero".alumnos a WHERE a.matricula = "control financiero".observaciones.matricula)`,
          idCarrera: user.id_carrera
        }
      };
    }
    return undefined;
  }
});
