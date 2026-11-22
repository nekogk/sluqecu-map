@echo off
cd /d "%~dp0"
py recolor.py sluqecu_map04.svg sluqecu_map00.svg
py recolor.py sluqecu_map05.svg sluqecu_map01.svg
py recolor.py sluqecu_map06.svg sluqecu_map02.svg
py recolor.py sluqecu_map07.svg sluqecu_map03.svg
pause