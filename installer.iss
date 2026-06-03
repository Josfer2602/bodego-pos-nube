[Setup]
AppName=Bodego
AppVersion=1.0
DefaultDirName={autopf}\Bodego
DefaultGroupName=Bodego
UninstallDisplayIcon={app}\Bodego.exe
Compression=lzma2
SolidCompression=yes
OutputDir=Output
OutputBaseFilename=Instalador_Bodego

[Files]
Source: "backend\dist\Bodego.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Bodego"; Filename: "{app}\Bodego.exe"
Name: "{autodesktop}\Bodego"; Filename: "{app}\Bodego.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Accesos directos adicionales:"; Flags: checkedonce

[Run]
Filename: "{app}\Bodego.exe"; Description: "Iniciar Bodego"; Flags: nowait postinstall skipifsilent
