import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../app/page.js';

beforeEach(() => {
  localStorage.clear();
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true, json:async()=>({power:null,ndvi:null,et:null,pet:null})}));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('BogaraShift navigation and workflow', () => {
  it('links to real sections and mobile navigation opens and closes', () => {
    render(<App/>);
    for (const name of ['Обзор поля', 'Сравнение ротаций', 'Данные и методология']) {
      const link = screen.getByRole('link', {name});
      expect(document.querySelector(link.getAttribute('href'))).not.toBeNull();
    }
    const menu = screen.getByRole('button', {name:'Открыть меню'});
    fireEvent.click(menu);
    expect(screen.getByRole('button', {name:'Закрыть меню'}).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('link', {name:'Сравнение ротаций'}));
    expect(screen.getByRole('button', {name:'Открыть меню'}).getAttribute('aria-expanded')).toBe('false');
  });
  it('edits, validates and persists field and rotation; strategy selection updates details', () => {
    render(<App/>);
    fireEvent.click(screen.getAllByRole('button', {name:'Настроить поле'})[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Широта'), {target:{value:'30'}});
    fireEvent.click(within(dialog).getByRole('button', {name:/Сохранить поле/}));
    expect(within(dialog).getByText(/Введите координаты в пределах/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('Широта'), {target:{value:'42.3'}});
    fireEvent.change(within(dialog).getByLabelText('Название поля'), {target:{value:'Поле 7'}});
    fireEvent.change(within(dialog).getByLabelText('Год 1'), {target:{value:'Нут'}});
    fireEvent.change(within(dialog).getByLabelText('Главный приоритет'), {target:{value:'Защитить почву'}});
    fireEvent.click(within(dialog).getByRole('button', {name:/Сохранить поле/}));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Поле 7')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('bogara-field')).rotation[0]).toBe('Нут');
    fireEvent.click(screen.getByRole('button', {name:/Текущая ротация/}));
    expect(screen.getByText(/СТРАТЕГИЯ A · ДЕТАЛИ/)).toBeTruthy();
  });
  it('opens contextual explanations and closes settings with Escape', () => {
    render(<App/>);
    fireEvent.click(screen.getByRole('button', {name:'Подробнее: Зелёность NDVI'}));
    expect(screen.getByRole('region', {name:'Зелёность NDVI'}).textContent).toContain('не определяет культуру');
    fireEvent.click(screen.getByRole('button', {name:'Закрыть пояснение'}));
    expect(screen.queryByRole('region', {name:'Зелёность NDVI'})).toBeNull();
    fireEvent.click(screen.getAllByRole('button', {name:'Настроить поле'})[0]);
    fireEvent.keyDown(document, {key:'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('shows actual fetched historical rows and unavailable sources without fake values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok:true, json:async()=>({power:{median:92,below:0,hotMedian:10,years:[{year:2005,precipitation:92,hotDays:10}]},ndvi:null,et:null,pet:null})}));
    render(<App/>);
    await waitFor(()=>expect(screen.getByText('92 мм')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', {name:'Посмотреть историю по годам'}));
    expect(screen.getByRole('table').textContent).toContain('2005');
    expect(screen.getByText(/часть источников недоступна/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name:'Скрыть историю по годам'}));
    expect(screen.queryByRole('table')).toBeNull();
    vi.unstubAllGlobals();
  });
  it('does not attach a previous field response after settings change', async () => {
    const resolvers = [];
    vi.stubGlobal('fetch', vi.fn(()=>new Promise(r=>{resolvers.push(r);})));
    render(<App/>);
    await waitFor(()=>expect(resolvers.length).toBe(1));
    fireEvent.click(screen.getAllByRole('button', {name:'Настроить поле'})[0]);
    fireEvent.change(screen.getByLabelText('Широта'), {target:{value:'42.3'}});
    fireEvent.click(screen.getByRole('button', {name:/Сохранить поле/}));
    await waitFor(()=>expect(resolvers.length).toBe(2));
    resolvers[0]({ok:true, json:async()=>({power:{median:999,below:0,hotMedian:1,years:[]}})});
    await waitFor(()=>expect(screen.queryByText('999 мм')).toBeNull());
    expect(screen.getByRole('status').textContent).toContain('Загружаем');
    vi.unstubAllGlobals();
  });
  it('switches languages, translates controls and persists the selection without refetching', async () => {
    render(<App/>);
    await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Язык'), {target:{value:'en'}});
    expect(screen.getByRole('heading', {name:'What the data tells us'})).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('bogara-language')).toBe('en');
    fireEvent.click(screen.getAllByRole('button', {name:'Configure field'})[0]);
    expect(screen.getByLabelText('Field name').value).toBe('Field in the foothills');
    expect(screen.getByLabelText('Year 1').selectedOptions[0].textContent).toBe('Winter wheat');
    fireEvent.click(screen.getByRole('button', {name:'Cancel'}));
    fireEvent.change(screen.getByLabelText('Language'), {target:{value:'kk'}});
    expect(screen.getByRole('heading', {name:'Деректер не көрсетеді?'})).toBeTruthy();
    expect(document.documentElement.lang).toBe('kk');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('loads saved coordinates on startup without first fetching the default location', async () => {
    localStorage.setItem('bogara-field', JSON.stringify({field:'Test', lat:'42.6', lon:'69.5', priority:'Сохранить влагу', rotation:Array(5).fill('Озимая пшеница')}));
    render(<App/>);
    await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch.mock.calls[0][0]).toContain('lat=42.6&lon=69.5');
  });
});
