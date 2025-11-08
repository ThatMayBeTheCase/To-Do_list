const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');
const counter = document.querySelector('#todo-counter');
const filters = document.querySelectorAll('.filters button');

let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
let currentFilter = 'all';

render();

form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    const task = {
        id: crypto.randomUUID(),
        text,
        completed: false,
    };

    tasks.push(task);
    persist();
    render();
    form.reset();
});

list.addEventListener('click', event => {
    const { target } = event;

    if (target.matches('[data-action="toggle"]')) {
        const id = target.closest('li').dataset.id;
        tasks = tasks.map(task =>
            task.id === id ? { ...task, completed: !task.completed } : task
        );

        persist();
        render();
    }

    if (target.matches('[data-action="delete"]')) {
        const id = target.closest('li').dataset.id;
        tasks = tasks.filter(task => task.id !== id);

        persist();
        render();
    }
});

filters.forEach(button => {
    button.addEventListener('click', () => {
        filters.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentFilter = button.dataset.filter;
        render();
    });
});

function render() {
    const filtered = tasks.filter(task => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });

    list.innerHTML = filtered
        .map(
            task => `
            <li data-id="${task.id}" class="${task.completed ? 'completed' : ''}">
                <span>${task.text}</span>
                <div>
                    <button data-action="toggle">
                        ${task.completed ? 'Undo' : 'Done'}
                    </button>
                    <button data-action="delete">Delete</button>
                </div>
            </li>`
        )
        .join('');

    const remaining = tasks.filter(task => !task.completed).length;
    counter.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''} · ${remaining} left`;
}

function persist() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}
