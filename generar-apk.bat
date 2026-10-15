@echo off
setlocal EnableExtensions
chcp 65001 >nul
title BaseballScorer - Generar APK

rem ============================================================
rem  Genera el APK de BaseballScorer listo para instalar en Android.
rem  Resultado: dist\BaseballScorer.apk
rem  Uso: doble clic, o desde consola:  generar-apk.bat [limpio]
rem       "limpio" borra compilaciones anteriores antes de compilar.
rem ============================================================

cd /d "%~dp0"
set "APP_NAME=BaseballScorer"
set "DIST=%~dp0dist"
set "APK_SRC=%~dp0android\app\build\outputs\apk\release\app-release.apk"

echo.
echo ==== [1/5] Verificando herramientas ====
where node >nul 2>&1 || (echo [ERROR] No se encontro Node.js. Instalalo desde https://nodejs.org & goto :fail)
where npm  >nul 2>&1 || (echo [ERROR] No se encontro npm. & goto :fail)
if not defined JAVA_HOME (
  where java >nul 2>&1 || (echo [ERROR] No se encontro Java ^(JDK 17+^). Configura JAVA_HOME. & goto :fail)
)
if not defined ANDROID_HOME if not defined ANDROID_SDK_ROOT if not exist "android\local.properties" (
  if exist "%LOCALAPPDATA%\Android\Sdk" (
    set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
  ) else (
    echo [ERROR] No se encontro el Android SDK. Configura ANDROID_HOME.
    goto :fail
  )
)
for /f "delims=" %%v in ('node -v') do echo Node %%v

echo.
echo ==== [2/5] Instalando dependencias ====
if not exist "node_modules" (
  call npm install || goto :fail
)
set "MISSING="
if not exist "node_modules\@react-native-async-storage\async-storage" set "MISSING=1"
if not exist "node_modules\react-native-image-picker" set "MISSING=1"
if defined MISSING (
  echo Instalando AsyncStorage e Image Picker...
  call npm install @react-native-async-storage/async-storage react-native-image-picker || goto :fail
) else (
  echo Dependencias OK.
)

echo.
echo ==== [3/5] Compilando APK (puede tardar varios minutos) ====
pushd android
if /i "%~1"=="limpio" (
  echo Limpiando compilaciones anteriores...
  call gradlew.bat clean
)
rem Solo arquitecturas de telefonos reales para un APK mas ligero y compilacion mas rapida
call gradlew.bat assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
set "BUILD_RESULT=%ERRORLEVEL%"
popd
if not "%BUILD_RESULT%"=="0" (
  echo [ERROR] Fallo la compilacion. Revisa los mensajes de arriba.
  echo Tip: prueba de nuevo con:  generar-apk.bat limpio
  goto :fail
)
if not exist "%APK_SRC%" (
  echo [ERROR] No se encontro el APK generado en:
  echo   %APK_SRC%
  goto :fail
)

echo.
echo ==== [4/5] Copiando APK ====
if not exist "%DIST%" mkdir "%DIST%"
copy /y "%APK_SRC%" "%DIST%\%APP_NAME%.apk" >nul || goto :fail
for %%A in ("%DIST%\%APP_NAME%.apk") do set "SIZE=%%~zA"
set /a SIZE_MB=%SIZE% / 1048576
echo Listo: %DIST%\%APP_NAME%.apk  (~%SIZE_MB% MB)

echo.
echo ==== [5/5] Instalar en el telefono (opcional) ====
where adb >nul 2>&1
if errorlevel 1 if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "PATH=%ANDROID_HOME%\platform-tools;%PATH%"
where adb >nul 2>&1
if errorlevel 1 (
  echo adb no disponible; copia el APK al telefono e instalalo manualmente.
  goto :done
)
set "DEVICE="
for /f "skip=1 tokens=1,2" %%a in ('adb devices') do if "%%b"=="device" set "DEVICE=%%a"
if not defined DEVICE (
  echo No hay telefono conectado por USB. Copia el APK al telefono e instalalo manualmente.
  goto :done
)
choice /c SN /m "Telefono detectado (%DEVICE%). Instalar ahora"
if errorlevel 2 goto :done
adb install -r "%DIST%\%APP_NAME%.apk"
if errorlevel 1 (
  echo [AVISO] No se pudo instalar. Si ya tenias otra version firmada distinto, desinstalala primero.
)

:done
echo.
echo ===========================================
echo  APK generado: dist\%APP_NAME%.apk
echo ===========================================
start "" explorer "%DIST%"
pause
exit /b 0

:fail
echo.
echo *** No se pudo generar el APK ***
pause
exit /b 1
