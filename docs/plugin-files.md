# Exportar e importar un plugin como archivo { #plugin-files }

!!! note "Disponible con Kino 0.9.74"
    Disponible con Kino 0.9.74 (la próxima versión, aún no publicada). No cambia el `apiVersion`: cualquier plugin se
    puede exportar, y un Kino anterior simplemente no abre el archivo.

Un repositorio puede desaparecer. Para que la gente pueda conservar un plugin que usa, Kino exporta cualquier plugin
instalado como un solo archivo: Plugins ▸ Instalados ▸ Gestionar ▸ "Exportar plugin" en un celular comparte un archivo
`<id>-<version>.kinoplugin`. Abrir ese archivo con Kino en un celular ("Abrir con Kino", o Plugins ▸ Agregar ▸
"Importar plugin desde un archivo") muestra la misma hoja de consentimiento que una instalación desde GitHub y lo instala
como **plugin local**: no tiene repositorio, nunca se actualiza solo y se queda en ese aparato (la sincronización de
plugins no lleva código, así que la persona vuelve a compartir el archivo para tenerlo en otro aparato).

## Qué lleva el archivo { #contents }

**Es una copia del código, no de los datos de la persona.** El archivo es un ZIP con exactamente `kino-plugin.json`
(byte por byte como se instaló, con su `signature`), tu script `entry`, tu `icon` y `panel.iconFile`, y un
`kino-export.json` que nombra cada una de las demás entradas con su sha256 y la dirección de GitHub desde la que se
instaló (`originalAddress`, o `null`). Nunca los ajustes de la persona, sus contraseñas, los secretos sellados o
abiertos, las cookies, el almacenamiento ni las aprobaciones. Los scrapers de Nuvio, los addons de Stremio y los plugins
de CloudStream los genera Kino y no se exportan.

## La firma se conserva { #signature }

Tu firma va atada a tu `owner/repo[/path]`, y el archivo lleva esa dirección, así que un [plugin firmado](signed.md)
exportado se sigue verificando al importarlo y muestra "Firmado por" con la huella de tu llave. Lo que Kino fija es tu
*llave*: un archivo firmado con esa misma llave actualiza (o, si se confirma, baja de versión) el plugin sin importar la
dirección desde la que se instaló; un archivo firmado con otra llave, un archivo sin firma sobre tu plugin firmado o un
archivo firmado sobre una instalación sin firma de ese id se rechazan. Si tu repositorio desaparece y vuelves a publicar
en uno nuevo, firma otra vez ahí con la misma llave (la firma nombra el nuevo `owner/repo`): quien guardó tu plugin como
archivo local puede instalar la dirección nueva encima, porque la llave coincide, y desde entonces se actualiza otra vez
desde ahí.

## Los secretos sellados no viajan { #secrets }

Los [secretos sellados](manifest.md#secrets) solo se abren contra el repositorio para el que se sellaron; un plugin
importado que declara `secrets` se instala, la hoja dice que sus llaves selladas no van a funcionar, y `kino.secret`
responde como para un nombre no declarado.

## Modificar y volver a compartir { #modify }

Edita los archivos, vuelve a calcular cada sha256 de `kino-export.json` (Kino rechaza un archivo cuyo contenido no
coincide) y quita el bloque `signature`, que ya no se verifica sobre código cambiado: el resultado es un plugin local sin
firma. Kino rechaza nombres fuera de esa lista, `..`, rutas absolutas, enlaces simbólicos, duplicados, archivos que pasan
los topes del instalador (script de 1 MB, manifiesto de 16 KB, archivo entero de 8 MB) y un `apiVersion` que este Kino
no soporta. El id de un plugin recomendado solo lo toma un archivo firmado con la llave de autor de ese plugin.
