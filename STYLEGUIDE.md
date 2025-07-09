# Coding Styleguide / Userfull information

## Generell

Alle Veränderungen werden auf einen Branch != origin/main gepusht
Merge Requests werden von Jamie gemacht und durchgeführt, da er den Code vorher überprüft.
KI darf ausdrücklich verwendet werden, jedoch überprüft bitte ob es sinn macht was die KI da macht.

Variabeln sollen Aussagend sein (!= var1, var2)
Variabeln beim aufruf von Funktionen sollten bitte wenn möglich gleich bleiben

## Bot

### Utils

Unter 'bot/utils/error_admin_dm.go' finden wir einen Log Services, welcher sowohl als nur log, als auch als Notification Tool eingesetzt werden kann.
importierbar mit "bot/utils"
Verwendung im Code: utils.LogAndNotfiyAdmins