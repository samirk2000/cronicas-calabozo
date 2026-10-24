# Crónicas del Calabozo

RPG 2D por casillas, estilo Tibia, con un mundo original: la ciudad de Valdoria y su Torre. HTML5 + Canvas en JavaScript puro. Todo el arte y el sonido se generan por código, sin archivos externos.

## Cómo jugar
- Abre `index.html` en el navegador, o ejecuta `python3 -m http.server` en esta carpeta y entra a http://localhost:8000
- La partida se guarda sola en localStorage: cada 30 s, al cambiar de piso, al dormir y al cerrar la página.

## Controles
| Tecla | Acción |
|---|---|
| WASD / flechas | Moverse (por casillas) |
| Espacio | Atacar (el ataque es automático si hay un enemigo al lado) |
| Clic en un enemigo | Elegirlo como objetivo |
| E | Usar: hablar, talar, minar, recolectar, escaleras, cama o cofre |
| 1-4 | Habilidades: Golpe Poderoso, Torbellino, Bola de Fuego, Curación |
| 5 / 6 | Poción de vida / de maná |
| I / K / C / J | Inventario y estado / árbol de habilidades / fabricación / misiones |
| H | Mejorar la casa |
| B | Modo construcción (Q/R cambia el bloque, Espacio o clic coloca, X o clic derecho quita) |
| Esc | Cerrar el panel |
En móvil aparecen una cruceta y botones táctiles.

## Características
- **Ciudad de Valdoria**: NPCs Noa (misiones del gremio), Gaspar (tienda: compra y venta), Brann (herrería y fabricación) y Aurelia (te cura y te recuerda los puntos libres).
- **Calabozo infinito**: los pisos se generan con salas y pasillos, la oscuridad se ilumina con tu antorcha, cada piso es más difícil y hay 10 tipos de enemigos. Cada 5 pisos aparece un **jefe** (Minotauro, Ojos de Ascua, Coloso de Hueso…) que abre la escalera al morir. Hay puntos de control cada 5 pisos.
- **Progresión**: niveles, 3 puntos de estado por nivel (Fuerza, Vitalidad, Agilidad, Inteligencia) y un árbol de 9 habilidades en 3 ramas (Guerrero, Mago, Supervivencia).
- **Botín**: armas, armaduras, cascos y anillos con 5 rarezas (de Común a Legendario), estadísticas aleatorias y comparación con lo equipado en la descripción emergente.
- **Recolección**: árboles, rocas, hierro, hierbas y cristales. Los recursos de la ciudad vuelven a crecer.
- **Fabricación**: 21 recetas entre bloques, muebles, pociones y equipo forjado.
- **Vivienda**: una parcela propia para construir muros, suelos y puertas y decorarla con cama, mesa, estantería, estatua, etc. El **confort** de la casa aumenta la regeneración en la ciudad. La cama sirve para descansar y guardar, y el cofre para almacenar.
- **Misiones**: una cadena de 11 misiones del gremio.
- **Efectos (game juice)**: sacudida de cámara, partículas, destello al recibir golpes, números de daño y críticos, anillos de nivel, ciclo de día y noche, y efectos de sonido procedurales con WebAudio.
- Al morir pierdes el 10 % del oro y apareces en la ciudad con una pantalla de estadísticas. El récord de piso queda guardado.

## Novedades (iteración 2)
- **IA con A\***: los enemigos rodean los obstáculos para alcanzarte.
- **Enemigos a distancia**: el Kobold arquero dispara flechas y el Mago oscuro lanza orbes mágicos; ambos necesitan línea de visión y mantienen la distancia.
- **Patrones de jefe**: golpe sísmico en área (las casillas se marcan antes de golpear), ráfaga radial de proyectiles, carga en línea, lluvia de golpes e invocación de esbirros. Por debajo del 50 % de vida el jefe entra en **furia** y ataca más rápido.
- **Temas cada 10 pisos**: Cavernas, Bosque Subterráneo, Glaciar Eterno y Abismo Ígneo, cada uno con su paleta y el color de sus antorchas.
- **Monstruos raros dorados** (4 %): triple de vida, cinco veces más XP y botín épico o legendario garantizado.
- **Iluminación dinámica**: antorchas en las paredes del calabozo, antorchas, chimeneas y lámparas que tú colocas, y bolas de fuego que iluminan. En la ciudad hay noches.
- **Animación**: caminar con piernas y brazos. El **equipo se ve** en el personaje: casco, color y ribete de la armadura, capa en rareza Rara o superior, forma del arma (espada, hacha, maza, katana), brillo del arma y del anillo.
- **Vivienda ampliada**: 12 muebles nuevos (chimenea, sofá, armario, cuadro, lámpara, barril, bañera, piano, fuente, armero, trofeo de jefe y valla) y **3 niveles de casa** (Parcela → Casa de campo → Mansión del héroe) que agrandan el terreno y multiplican el confort.

## Pruebas
`python3 tests/smoke_test.py` (necesita Playwright y Chrome) ejecuta 23 comprobaciones automáticas: combate, botín, XP, misiones, jefe, A*, enemigos a distancia, temas, monstruos raros, fabricación, construcción, mejora de casa, guardado y carga, muerte, y que no haya errores de JS.

## Novedades (iteración 3)
- **Clases** al empezar: Guerrero (espada y Golpe Poderoso), Mago (báculo, que da INT, y Bola de Fuego) y Arquero (**arco a distancia** con autoapuntado en línea de visión, +8 % de crítico).
- **Cultivos**: fabrica *Tierra de cultivo*, colócala con B y pulsa E para plantar, regar (cada etapa necesita agua) y cosechar. Hay trigo, zanahoria y fresa. Las semillas se compran a Gaspar o salen al recoger hierbas.
- **Cocina con buffs** (teclas 7, 8, 9 y 0, o desde el inventario): Pan (Fuerza +25 %), Estofado (Defensa +30 %), Tarta de fresa (XP +40 %) y Banquete (regeneración x3).
- **Visitantes**: según el confort llegan aventureros (Alma, Lucía, Teo…) que comentan tu casa y te regalan oro y materiales. Con confort alto también te inspiran (+XP).
- **Música procedural** con WebAudio en tres pistas: ciudad, calabozo y jefe. **M** la silencia o la activa, y la preferencia se guarda.
- **Mando**: el stick o la cruceta mueven; A ataca, B usa o cierra, X lanza Bola de Fuego, Y Golpe Poderoso, LB/RB las pociones, LT/RT Torbellino/Curación, Select abre las habilidades y Start el inventario.
- **Exportar e importar partida**: en Opciones (O) se descarga un .txt con un código y se puede pegar uno para importarlo. También se importa un archivo desde la pantalla de título.
- Las pruebas suben a **32** (`python3 tests/smoke_test.py`).

## Novedades (iteración 4)
- **Llanuras de Valdoria** (mundo abierto estilo Tibia): sal por el letrero al sur de la ciudad. Hay monstruos errantes que se vuelven más fuertes cuanto más al sur y al este vas, se regeneran con el tiempo y solo atacan si te acercas. También hay bosques, un lago para pescar, una zona minera con hierro y cristales, y una segunda entrada al calabozo en la torre del sur.
- **Pesca**: fabrica una *Caña de pescar*, mira al agua y pulsa E. Es un minijuego: mantén ESPACIO para que la zona verde siga al pez y llena la barra. Hay trucha, carpa, salmón y **pez dorado** (más frecuente con lluvia). Con pescado se cocina *Pescado asado* y *Sushi dorado*.
- **Estaciones y clima**: cada día dura 4 minutos y cada estación 7 días (Primavera, Verano, Otoño, Invierno). El pasto y los árboles cambian de color, y en invierno hay nieve. La **lluvia riega** los cultivos, en invierno crecen a la mitad de velocidad y las tormentas traen relámpagos.
- **Mesas de fabricación**: hay que colocarlas **dentro de tu casa**. El *Yunque* es necesario para el equipo, y la *Forja* además para el equipo épico o mejor. La *Cocina* sirve para la comida y la *Mesa de alquimia* para las pociones. Los requisitos aparecen en verde o rojo en el panel C.
- **Amistad con NPCs** (E sobre Noa, Gaspar, Brann o Aurelia): se puede charlar una vez al día y hacer un regalo diario. Los regalos favoritos dan +12 y los demás +4, hasta 10 corazones. Cada NPC da recompensas: Noa oro, puntos de habilidad y un anillo épico; Gaspar descuentos, pociones y oro; Brann equipo forjado y la *Espada Mágica Ascua*; Aurelia puntos de estado, banquetes y su bendición.
- **Logros** (L): 19 logros con recompensa en oro.
- Las pruebas suben a **41** (`python3 tests/smoke_test.py`).

## Novedades (iteración 5)
- **Cámara limitada** a los bordes del mapa (ya no hay franja oscura) y **minimapa centrado** que muestra NPCs (amarillo) y compañeros (azul).
- **Ciudad estilo Tibia**: edificios con tejado y estos NPCs:
  - **Banco**: depositar y retirar oro. El oro del banco no se pierde al morir y da un 1 % de interés diario (máx. 500).
  - **Depósito**: almacén ilimitado de objetos y materiales.
  - **Templo**: curación gratis, revivir aliados y una *bendición* que evita la pérdida de oro en la siguiente muerte.
  - **Establo de Tadeo**: mascotas y monturas.
  - **Bárbara (Reclutas)**: aliados para tu grupo.
- **Mascotas** que te siguen y pelean: Perro, Gato de la suerte (+25 % de oro), Halcón (ataca a distancia) y Slime (te cura poco a poco).
- **Monturas** (N para montar o desmontar): Caballo (35 % más rápido) y Lobo gigante (50 % más rápido y +10 % de ataque).
- **Grupo de aventureros** (hasta 2 aliados): Bruno (tanque), Selene (sacerdotisa que cura), Tala (arquera), Iris (maga) y Corvo (caballero oscuro). Suben de nivel contigo y reciben golpes. Si caen, se reviven en el Templo.
- **Mercader errante** en el calabozo: aparece siempre en los pisos 2, 5, 8… cuando no son de jefe, y con un 25 % de probabilidad en los demás. Vende 3 objetos de rareza Rara o superior y elixires, y no hay monstruos cerca de él.
- **Títulos**: en Logros (L) puedes elegir un logro desbloqueado como título, que aparece sobre tu personaje.
- Las pruebas suben a **53** (`python3 tests/smoke_test.py`).

## Novedades (iteración 6)
- **Reloj y día/noche reales**: un día dura 4 minutos (10 s por hora) y empieza a las 06:00. Atardece a las 18:00 y anochece por completo a las 21:00. La hora aparece en el HUD. Dormir de noche en tu cama te lleva a las 06:00 del día siguiente.
- **Horarios de tiendas**: Gaspar 8–20, Brann 8–19, Banco 9–18, Establo 7–20, Reclutas 8–22, Noa 8–21 y Coliseo 10–23. El Depósito y el Templo abren las 24 h. Cuando un local está cerrado, su NPC muestra «Zzz».
- **Hechizos con palabras estilo Tibia**: pulsa **Enter** y escribe el hechizo, o usa **F1-F4** (los atajos se configuran en Opciones). Las palabras flotan sobre tu personaje y, si escribes algo que no es un hechizo, se muestra como diálogo.
  - `exura`, `exura gran`, `exura vita`: curaciones
  - `exori`, `exori gran`: golpe en área
  - `exevo flam hur`: ola de fuego
  - `exevo gran mas vis`: Furia de los cielos, daño en un radio de 6 casillas
  - `utani hur`: prisa
  - `utamo vita`: escudo mágico, el daño se descuenta del maná
  - `utevo lux`: luz
  - `exevo pan`: crea comida
- **Mascotas con nivel**: ganan XP al combatir (hasta nivel 30) y ganan daño con cada nivel. A nivel 10 **evolucionan**: Perro → Cerbero, Gato → Nekomata (+50 % de oro), Halcón → Grifo y Slime → Rey Slime.
- **Misiones personales de aliados**: cada recluta tiene su historia (Bruno, Selene, Tala, Iris, Corvo). Al completarla se vuelve **Veterano** (+40 % de vida y daño) y te da 300 de oro.
- **Coliseo (arena PvE)**: oleadas cada vez más fuertes con un **campeón** cada 5. Cada oleada da oro, XP y fichas, y cada 5 oleadas hay un premio épico o legendario. Morir aquí no cuesta oro. Las fichas se canjean por cofres épicos o legendarios y por elixires de mascota. El récord queda guardado.
- Las pruebas suben a **63** (`python3 tests/smoke_test.py`).

## Novedades (iteración 7)
- **Horarios de NPCs**: Noa, Gaspar, Brann, Aurelia, el banquero, Tadeo y Bárbara trabajan durante su horario, al cerrar se van a la **taberna** y de 22:00 a 07:00 duermen en su casa (no aparecen). Caminan por la ciudad con A*. Si les hablas en la taberna, te cuentan cosas.
- **Taberna «El Ciervo Dorado»** (Rufina, de 10:00 a 02:00): vende comida con buffs y rumores con pistas. «Invitar una ronda» da +5 de amistad con todos los presentes.
- **Casa de Subastas**: pon a la venta hasta 8 objetos con un multiplicador de precio (5 % de comisión). Cada hora pasan compradores NPC simulados, y cuanto más caro sea el precio respecto al valor, menos probable es la venta. Las ganancias se cobran en el NPC. Además hay 4 ofertas diarias de otros vendedores.
- **Runas estilo Tibia**: fabrica *runas en blanco* en la Mesa de alquimia y conjúralas escribiendo `adori gran` (Gran bola de fuego en área de 3×3, tecla **R**), `adori vita vis` (Muerte súbita, gran daño a un objetivo, **T**) o `adura vita` (curación definitiva, **Y**). Las runas apuntan solas a tu objetivo o al enemigo visible más cercano.
- **Torneo semanal** en el Coliseo (cada 7 días): 12 oleadas contra la puntuación de rivales como Garrik el Lobo, Selin Vientoalba o Ulrik el Coloso. Premios: 100/50/25 fichas, 5 por participar, y el logro y título «Campeón del Coliseo». Se puede entrar una vez por semana.
- **Habilidades de mascota (tecla P)**: Perro, *Mordisco feroz* (gran daño y aturde); Halcón, *Picada* (3 golpes, o 5 si evolucionó); Gato, *Robo felino* (oro y posible objeto); Slime, *Curación gelatinosa* (30-45 % de vida y cura al grupo). Tienen recarga.
- **Balance de inicio**: empiezas con 100 de oro, 5 pociones de vida, 2 de maná y 2 panes. La curva de XP es más suave y los monstruos dan más XP y oro, con más botín en los primeros pisos. Las primeras 4 misiones dan premios (kit de construcción, arma de tu clase, cama con antorchas y armadura rara). En ~30 combates y 4 misiones se llega a nivel 6 o más.
- **Arreglo**: los textos flotantes ya no pasan de un mapa a otro.
- Las pruebas suben a **72** (`python3 tests/smoke_test.py`).

## Novedades (iteración 8)
- **Mejora de equipo (+1..+10)** en la forja de Brann (botón «⚒ Mejorar equipo» en Fabricación). Cada + da +8 % a las estadísticas. Probabilidad de 100 % a 20 %. Un fallo por debajo de +5 solo gasta materiales; desde +5 baja un nivel; desde +8 tiene un 25 % de **destruir** el objeto. Cuesta oro, hierro y cristal. Brann con 6+ corazones da +5 %.
- **Eventos del calabozo**: trampas de pinchos o alarma (la agilidad ayuda a esquivarlas y detectarlas), salas del tesoro con cofres (¡cuidado con los mímicos!) y casas de monstruos (desde el piso 4) con gran recompensa al limpiarlas.
- **Mapa del mundo (Tab)**: mapa completo de la zona actual con NPCs, enemigos, compañeros, cofres, tu casa y la sede, más rutas y pisos explorados.
- **Sede del Gremio** (3000 oro, con Bárbara): vivienda compartida con tus aliados. En la ciudad descansan ahí, se curan y reviven solos; la decoración (confort) les da hasta +30 % de vida y daño.
- **Historia ramificada** (panel J): ruta Aurelia (+10 % XP, Pipa como aliada o recompensa del Gremio) o ruta Varkas (+10 % daño, título o arma legendaria), final contra el Minotauro del piso 10 con títulos distintos.

## Novedades (iteración 9)
- **Pergaminos de protección** (400 oro, en la forja de Brann): si está activada la casilla, un fallo desde +5 no baja ni destruye el objeto; se consume el pergamino.
- **Historia ampliada**: capítulo 4 «Los Hablantes» (piso 15: proteger a Ysra, que se une como aliada, o venderla), capítulo 5 «La traición» (jefe del piso 20, decidir el destino de Mordo Kast) y capítulo 6 «El Dragón de Ceniza» (jefe del piso 30, final «Héroe de Valdoria» o «Matadragones»).
- **Trampas nuevas**: ballestas en las paredes que disparan flechas cuando te pones en su línea, y sierras móviles que patrullan las salas.
- **Niebla de guerra**: el minimapa y el mapa del mundo (Tab) solo muestran lo explorado en el calabozo y en las Llanuras (se guarda el progreso de las Llanuras). El mapa indica el % explorado.
- **Rendimiento**: los tiles estáticos se pintan por bloques de 16×16 en canvas fuera de pantalla y se reutilizan (solo se repinta el bloque que cambia); el minimapa también se guarda en caché.

## Novedades (iteración 10)
- **Mundo 100 % original**: la ciudad es **Valdoria** (con las Llanuras de Valdoria). Los dioses son Aurelia (la del hogar) y Varkas (el lobo), y cada uno tiene su **Casa**. Las habilidades salen del **Sello divino**. Los NPCs son Noa (Gremio), Gaspar (mercader), Brann (herrero), Rufina (taberna), Tadeo (establo) y Bárbara (reclutas). Los aliados son Bruno, Selene, Tala, Iris y Corvo, más Pipa e Ysra, que se desbloquean con la historia. Las partidas antiguas se migran solas.
- **Rendimiento**: según el perfil, la mitad del frame del calabozo se iba en el mapa de luz a pantalla completa. Ahora se dibuja a 1/4 de resolución y se escala con suavizado, y el fondo negro solo se pinta si el mapa no cubre la pantalla.
- **Pergamino de protección fabricable** (3 cristal, 4 hierba y 2 madera; necesita Mesa de alquimia y Yunque).
- **Tutorial contextual** para los primeros minutos (9 pasos: moverse, hablar con Noa, recolectar, inventario, salir, luchar, subir de nivel, construir y la ayuda). Se puede saltar y repetir desde la ayuda, y al terminarlo da 50 de oro.
- **Ayuda de teclas con `?`** (también con el botón ❓): muestra todas las teclas agrupadas, incluido el mando.
- **Móvil**: hay una barra de menú táctil arriba. En pantallas de 390 px los paneles ocupan todo el ancho, el botón «Cerrar» queda fijo, no hay scroll horizontal y los botones son más grandes.
