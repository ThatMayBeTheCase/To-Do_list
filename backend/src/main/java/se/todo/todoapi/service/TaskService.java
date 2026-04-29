package se.todo.todoapi.service;

import org.springframework.stereotype.Service;
import se.todo.todoapi.dto.CreateTaskRequest;
import se.todo.todoapi.dto.TaskResponse;
import se.todo.todoapi.entity.Category;
import se.todo.todoapi.entity.Task;
import se.todo.todoapi.entity.User;
import se.todo.todoapi.repository.CategoryRepository;
import se.todo.todoapi.repository.TaskRepository;
import se.todo.todoapi.repository.UserRepository;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    public TaskService(TaskRepository taskRepository, UserRepository userRepository, CategoryRepository categoryRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
    }

    public TaskResponse createTask(CreateTaskRequest request) {
        User user = userRepository.findById(request.getUserId()).orElseThrow(() -> new RuntimeException("User not found"));

        Category category = categoryRepository.findById(request.getCategoryId()).orElseThrow(() -> new RuntimeException("Category not found"));

        Task task = new Task(
                request.getTitle(),
                request.getDescription(),
                request.isCompleted(),
                user,
                category
        );

        Task savedTask = taskRepository.save(task);

        return mapToTaskResponse(savedTask);
    }

    public List<TaskResponse> getAllTasks() {
        return taskRepository.findAll()
                .stream()
                .map(this::mapToTaskResponse)
                .toList();
    }

    private TaskResponse mapToTaskResponse(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.isCompleted(),
                task.getUser().getId(),
                task.getUser().getName(),
                task.getCategory().getId(),
                task.getCategory().getName()
        );
    }
}
