using System.Threading.Tasks;
using Crm.Api.Interfaces.Services;
using Crm.Api.Interfaces.Repositories;

namespace Crm.Api.Services;

public class SystemStateService : ISystemStateService
{
    private readonly ISystemStateRepository _repository;

    public SystemStateService(ISystemStateRepository repository)
    {
        _repository = repository;
    }

    public async Task<object> GetGlobalSnapshotAsync()
    {
        return await _repository.GetGlobalSnapshotAsync();
    }
}
