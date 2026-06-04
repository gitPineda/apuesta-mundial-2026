import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { AppPopup } from './AppPopup';
import { LoadingScreen } from '../screens/main/LoadingScreen';
import { api } from '../services/api';
import { APP_PLATFORM } from '../config/appVersion';

interface AppVersionCheckResponse {
  supported: boolean;
  message: string;
}

type VersionState =
  | { status: 'checking' }
  | { status: 'supported' }
  | { status: 'obsolete'; message: string }
  | { status: 'error'; message: string };

export function AppVersionGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<VersionState>({ status: 'checking' });

  const checkVersion = useCallback(async () => {
    setState({ status: 'checking' });
    try {
      const result = await api.get<AppVersionCheckResponse>(
        `/app-version/check?platform=${encodeURIComponent(APP_PLATFORM)}`,
        false,
        90000,
      );
      if (result.supported) {
        setState({ status: 'supported' });
        return;
      }
      setState({
        status: 'obsolete',
        message: result.message,
      });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo validar la version de la app.',
      });
    }
  }, []);

  useEffect(() => {
    void checkVersion();
  }, [checkVersion]);

  if (state.status === 'supported') {
    return <>{children}</>;
  }

  return (
    <>
      <LoadingScreen message="Conectando con el servidor. Puede tardar si estuvo inactivo." />
      <AppPopup
        visible={state.status === 'obsolete'}
        title="Actualizacion requerida"
        message={state.status === 'obsolete' ? state.message : ''}
        buttonTitle="Actualizar app"
        onAccept={() => undefined}
      />
      <AppPopup
        visible={state.status === 'error'}
        title="Validacion pendiente"
        message={
          state.status === 'error'
            ? `${state.message} Intenta nuevamente para continuar.`
            : ''
        }
        buttonTitle="Reintentar"
        onAccept={checkVersion}
      />
    </>
  );
}
